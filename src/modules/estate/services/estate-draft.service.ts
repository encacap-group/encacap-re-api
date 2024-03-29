import { ESTATE_STATUS_ENUM, IREUser } from '@encacap-group/common/dist/re';
import { CategoryService } from '@modules/category/services/category.service';
import { ImageService } from '@modules/image/services/image.service';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BaseService } from 'src/base/base.service';
import { ContactService } from 'src/modules/contact/services/contact.service';
import { DistrictService } from 'src/modules/location/services/district.service';
import { ProvinceService } from 'src/modules/location/services/province.service';
import { WardService } from 'src/modules/location/services/ward.service';
import { UnitPriceService } from 'src/modules/unit-price/services/unit-price.service';
import { FindOptionsWhere, In, Repository } from 'typeorm';
import { ESTATE_ERROR_CODE } from '../constants/estate-error-code.constant';
import { EstateDraftCreateBodyDto } from '../dtos/estate-draft-create-body.dto';
import { EstateListQueryDto } from '../dtos/estate-list-query.dto';
import { EstateDraftEntity } from '../entities/estate-draft.entity';
import { EstateImageEntity } from '../entities/estate-image.entity';
import { EstateEntity } from '../entities/estate.entity';

@Injectable()
export class EstateDraftService extends BaseService {
  constructor(
    @InjectRepository(EstateDraftEntity)
    private readonly estateDraftRepository: Repository<EstateDraftEntity>,
    private readonly imageService: ImageService,
    private readonly unitPriceService: UnitPriceService,
    private readonly provinceService: ProvinceService,
    private readonly districtService: DistrictService,
    private readonly wardService: WardService,
    private readonly categoryService: CategoryService,
    private readonly contactService: ContactService,
  ) {
    super();
  }

  create(body: EstateDraftCreateBodyDto, user: IREUser) {
    return this.estateDraftRepository.save({
      userId: user.id,
      websiteId: user.websiteId,
      data: JSON.stringify(body),
    });
  }

  async getAll(query: EstateListQueryDto) {
    let queryBuilder = this.queryBuilder;

    queryBuilder = this.setPagination(queryBuilder, query);
    queryBuilder = this.setSort(queryBuilder, query, 'estateDraft', 'createdAt');

    const [records, total] = await queryBuilder.getManyAndCount();
    const parsedRecords = await Promise.all(
      records.map((record) =>
        this.mapRecordRelation({
          ...record,
          ...JSON.parse(record.data),
          id: record.id,
        }),
      ),
    );

    await this.imageService.mapVariantToImages(parsedRecords, 'images');
    await this.imageService.mapVariantToImage(parsedRecords, 'avatar');

    return this.generateGetAllResponse(parsedRecords, total, query);
  }

  async get(query: FindOptionsWhere<EstateDraftEntity>) {
    const record = await this.estateDraftRepository.findOneBy(query);

    if (!record) {
      throw new NotFoundException(ESTATE_ERROR_CODE.ESTATE_NOT_EXISTS);
    }

    const mappedRecord = await this.mapRecordRelation({
      ...record,
      ...JSON.parse(record.data),
      id: record.id,
    });

    await this.imageService.mapVariantToImage(mappedRecord, 'avatar');
    await this.imageService.mapVariantToImages(mappedRecord, 'images');

    return mappedRecord;
  }

  update(id: number, body: EstateDraftCreateBodyDto, user: IREUser) {
    return this.estateDraftRepository.update(
      {
        id,
        websiteId: user.websiteId,
      },
      {
        data: JSON.stringify(body),
      },
    );
  }

  async delete(query: FindOptionsWhere<EstateDraftEntity>) {
    const record = await this.get(query);

    return this.estateDraftRepository.remove(record as unknown as EstateDraftEntity);
  }

  private async mapRecordRelation(record: EstateEntity) {
    const {
      priceUnitId,
      areaUnitId,
      avatarId,
      imageIds,
      provinceCode,
      districtCode,
      wardCode,
      categoryId,
      contactId,
    } = record;

    if (priceUnitId) {
      record.priceUnit = await this.unitPriceService.get({ id: priceUnitId });
    }

    if (areaUnitId) {
      record.areaUnit = await this.unitPriceService.get({ id: areaUnitId });
    }

    if (provinceCode) {
      record.province = await this.provinceService.get({ code: provinceCode });
    }

    if (districtCode) {
      record.district = await this.districtService.get({ code: districtCode });
    }

    if (wardCode) {
      record.ward = await this.wardService.get({ code: wardCode });
    }

    if (categoryId) {
      record.category = await this.categoryService.get({ id: categoryId });
    }

    if (contactId) {
      record.contact = await this.contactService.get({ id: contactId });
    }

    if (avatarId) {
      record.avatar = await this.imageService.get(avatarId);
    }

    if (imageIds?.length) {
      record.images = (await this.imageService.getAll({
        where: {
          id: In(imageIds),
        },
      })) as unknown as EstateImageEntity[];
    }

    record.status = ESTATE_STATUS_ENUM.DRAFT;

    return record;
  }

  private get queryBuilder() {
    return this.estateDraftRepository.createQueryBuilder('estateDraft');
  }
}
