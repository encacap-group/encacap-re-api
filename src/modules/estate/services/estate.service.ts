import { ESTATE_STATUS_ENUM, IREUser } from '@encacap-group/common/dist/re';
import { ImageEntity } from '@modules/image/entities/image.entity';
import { ImageService } from '@modules/image/services/image.service';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { isObject, pickBy } from 'lodash';
import { BaseService } from 'src/base/base.service';
import { IAlgoliaEstate } from 'src/modules/algolia/interfaces/algolia.interface';
import { AlgoliaEstateService } from 'src/modules/algolia/services/algolia-estate.service';
import { CategoryPropertyEntity } from 'src/modules/category/entities/category-property.entity';
import { FindOptionsWhere, Repository } from 'typeorm';
import { ESTATE_ERROR_CODE } from '../constants/estate-error-code.constant';
import { EstateCreateBodyDto } from '../dtos/estate-create-body.dto';
import { EstateListQueryDto } from '../dtos/estate-list-query.dto';
import { EstateUpdateBodyDto } from '../dtos/estate-update-body.dto';
import { EstateImageEntity } from '../entities/estate-image.entity';
import { EstateEntity } from '../entities/estate.entity';
import { EstateImageService } from './estate-image.service';
import { EstatePropertyService } from './estate-property.service';

@Injectable()
export class EstateService extends BaseService {
  constructor(
    @InjectRepository(EstateEntity) private readonly estateRepository: Repository<EstateEntity>,
    private readonly estatePropertyService: EstatePropertyService,
    private readonly estateImageService: EstateImageService,
    private readonly imageService: ImageService,
    private readonly algoliaEstateService: AlgoliaEstateService,
  ) {
    super();
  }

  async create(body: EstateCreateBodyDto, user: IREUser) {
    const { id: estateId, status } = await this.estateRepository.save({
      ...pickBy(body, (value) => !isObject(value)),
      websiteId: user.websiteId,
      status: body.status ?? ESTATE_STATUS_ENUM.DRAFT,
      userId: user.id,
    });
    const { properties, imageIds } = body;

    await this.estatePropertyService.bulkSave(properties, estateId);
    await this.estateImageService.bulkSave(imageIds, estateId);

    if (status === ESTATE_STATUS_ENUM.PUBLISHED) {
      await this.saveToAlgolia(estateId);
    }

    return this.get({ id: estateId });
  }

  async update(id: number, body: EstateUpdateBodyDto) {
    await this.estateRepository.update(
      id,
      pickBy(body, (value) => !isObject(value)),
    );

    const { properties, imageIds } = body;

    if (properties) {
      await this.estatePropertyService.bulkSave(properties, id);
    }

    if (imageIds) {
      await this.estateImageService.bulkSave(imageIds, id);
    }

    await this.saveToAlgolia(id);

    return this.get({ id });
  }

  delete(id: number) {
    this.algoliaEstateService.remove(String(id));
    return this.estateRepository.softDelete(id);
  }

  async get(query: FindOptionsWhere<EstateEntity>) {
    const record = await this.queryBuilder.where(query).getOne();

    if (!record) {
      throw new NotFoundException(ESTATE_ERROR_CODE.ESTATE_NOT_EXISTS);
    }

    await this.imageService.mapVariantToImages(record, 'images');
    await this.imageService.mapVariantToImage(record, 'avatar');
    await this.imageService.mapVariantToImage(record, 'contact.avatar');

    return record;
  }

  async getAll(query: EstateListQueryDto) {
    let queryBuilder = this.queryBuilder;

    const { status } = query;
    let { statuses } = query;

    if (status && !statuses) {
      statuses = [status];
    }

    if (status && statuses) {
      statuses = [...statuses, status];
    }

    if (statuses?.length) {
      queryBuilder = this.setInFilter(queryBuilder, statuses, 'estate.status');
    }

    queryBuilder = this.setFilterOld(queryBuilder, query, 'estate', 'websiteId');
    queryBuilder = this.setFilterOld(queryBuilder, query, 'estate', 'categoryId');
    queryBuilder = this.setFilterOld(queryBuilder, query, 'estate', 'provinceCode');
    queryBuilder = this.setFilterOld(queryBuilder, query, 'estate', 'districtCode');
    queryBuilder = this.setFilterOld(queryBuilder, query, 'estate', 'wardCode');
    queryBuilder = this.setPagination(queryBuilder, query);
    queryBuilder = this.setSort(queryBuilder, query, 'estate', 'upvotedAt');
    queryBuilder = await this.setAlgoliaSearch(
      queryBuilder,
      query,
      this.algoliaEstateService.search.bind(this.algoliaEstateService),
      'estate.id',
    );

    const [records, total] = await queryBuilder.getManyAndCount();

    await this.imageService.mapVariantToImages(records, 'images');
    await this.imageService.mapVariantToImage(records, 'avatar');

    return this.generateGetAllResponse(records, total, query);
  }

  async getRandom(query: EstateListQueryDto) {
    const queryBuilder = this.queryBuilder.where(query).orderBy('RANDOM()');

    const [records, total] = await queryBuilder.getManyAndCount();

    await this.imageService.mapVariantToImages(records, 'images');
    await this.imageService.mapVariantToImage(records, 'avatar');

    return this.generateGetAllResponse(records, total, query);
  }

  unPublishById(id: number) {
    return this.update(id, { status: ESTATE_STATUS_ENUM.UNPUBLISHED });
  }

  publishById(id: number) {
    return this.update(id, { status: ESTATE_STATUS_ENUM.PUBLISHED });
  }

  upTopById(id: number) {
    return this.estateRepository.update(id, {
      upvotedAt: new Date(),
    });
  }

  private get queryBuilder() {
    return (
      this.estateRepository
        .createQueryBuilder('estate')
        // Properties
        .leftJoinAndSelect('estate.properties', 'property', 'property.estateId = estate.id')
        .leftJoinAndMapOne(
          'property.categoryProperty',
          CategoryPropertyEntity,
          'categoryProperty',
          'categoryProperty.id = property.categoryPropertyId',
        )
        // Images
        .leftJoin(EstateImageEntity, 'image', 'image.estateId = estate.id')
        .leftJoinAndMapMany(
          'estate.images',
          ImageEntity,
          'cloudflareImage',
          'cloudflareImage.id = image.imageId',
        )
        // Locations
        .leftJoinAndSelect('estate.province', 'province')
        .leftJoinAndSelect('estate.district', 'district')
        .leftJoinAndSelect('estate.ward', 'ward')

        .leftJoinAndSelect('estate.website', 'website')
        .leftJoinAndSelect('estate.quarter', 'quarter')
        .leftJoinAndSelect('estate.category', 'category')
        .leftJoinAndSelect('estate.avatar', 'avatar')
        .leftJoinAndSelect('estate.contact', 'contact')
        .leftJoinAndMapOne(
          'contact.avatar',
          ImageEntity,
          'contactAvatar',
          'contactAvatar.id = contact.avatarId',
        )
        .leftJoinAndSelect('estate.areaUnit', 'areaUnit')
        .leftJoinAndSelect('estate.priceUnit', 'priceUnit')
    );
  }

  private async saveToAlgolia(id: number) {
    const estate = await this.get({
      id,
    });

    const data: IAlgoliaEstate = {
      objectID: String(estate.id),
      provinceName: estate.province?.name,
      districtName: estate.district?.name,
      wardName: estate.ward?.name,
      address: estate.address,
      title: estate.title,
      customId: estate.customId,
      description: estate.description,
      categoryName: estate.category?.name,
      price: estate.price,
      area: estate.area,
      contactName: estate.contact?.name,
      propertyValues: estate.properties.map((property) => property.value),
      quarterName: estate.quarter?.name,
    };

    this.algoliaEstateService.save(data);
  }
}
