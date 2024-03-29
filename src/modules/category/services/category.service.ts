import { BaseService } from '@bases/base.service';
import { MEM_CACHING_KEY_ENUM } from '@constants/caching.constant';
import { AlgoliaCategoryService } from '@modules/algolia/services/algolia-category.service';
import { ImageService } from '@modules/image/services/image.service';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MemCachingService } from '@providers/mem-caching/mem-caching.service';
import { first, omit, pick, set } from 'lodash';
import { FindOptionsWhere, Repository } from 'typeorm';
import { CategoryCreateBodyDto } from '../dtos/category-create-body.dto';
import { CategoryListQueryDto } from '../dtos/category-list-query.dto';
import { CategoryUpdateBodyDto } from '../dtos/category-update-body.dto';
import { CategoryEntity } from '../entities/category.entity';

@Injectable()
export class CategoryService extends BaseService {
  constructor(
    @InjectRepository(CategoryEntity) private readonly categoryRepository: Repository<CategoryEntity>,
    private readonly algoliaCategoryService: AlgoliaCategoryService,
    private readonly imageService: ImageService,
    private readonly cacheService: MemCachingService,
  ) {
    super();
  }

  getOrFail(query: FindOptionsWhere<CategoryEntity>) {
    return this.queryBuilder.where(query).getOneOrFail();
  }

  async get(query: FindOptionsWhere<CategoryEntity>) {
    const queryBuilder = this.queryBuilder;

    if (this.isExpand(query, 'categoryGroup')) {
      queryBuilder.leftJoinAndSelect('category.categoryGroup', 'categoryGroup');
    }

    if (this.isExpand(query, 'website')) {
      queryBuilder.leftJoinAndSelect('category.website', 'website');
    }

    if (this.isExpand(query, 'avatar')) {
      queryBuilder.leftJoinAndSelect('category.avatar', 'avatar');
    }

    const record = await queryBuilder.where(omit(query, 'expand')).getOne();

    if (record && this.isExpand(query, 'parent')) {
      await this.mapParentToCategory(record);
    }

    if (record && this.isExpand(query, 'children')) {
      await this.mapChildrenToCategory(record, query);
    }

    if (this.isExpand(query, 'avatar')) {
      await this.imageService.mapVariantToImage(record, 'avatar');
    }

    return record;
  }

  async getAll(query: CategoryListQueryDto) {
    const queryBuilder = this.queryBuilder;
    const { parentCode, parentId, left, right, excludedCodes, categoryGroupCodes } = query;

    if (parentCode) {
      const { left, right } = await this.getOrFail({ code: parentCode });

      queryBuilder.andWhere('category.left > :left', { left });
      queryBuilder.andWhere('category.right < :right', { right });
    }

    if (parentId) {
      const { left, right } = await this.getOrFail({ id: parentId });

      queryBuilder.andWhere('category.left > :left', { left });
      queryBuilder.andWhere('category.right < :right', { right });
    }

    if (parentId === null) {
      const allCategories = await this.queryBuilder.where(pick(query, 'websiteId')).getMany();
      const rootCategory = allCategories.filter(
        (category) => !excludedCodes?.includes(category.code) && this.isRoot(category, allCategories),
      );
      const rootCategoryIds = rootCategory.map((category) => category.id);

      this.setInFilter(queryBuilder, rootCategoryIds, 'category.id');
    }

    if (left && right) {
      queryBuilder.andWhere('category.left > :left', { left });
      queryBuilder.andWhere('category.right < :right', { right });
    }

    if (this.isExpand(query, 'categoryGroup')) {
      queryBuilder.leftJoinAndSelect('category.categoryGroup', 'categoryGroup');
      this.setInFilter(queryBuilder, categoryGroupCodes, 'categoryGroup.code');
    }

    this.setFilter(queryBuilder, query.websiteId, 'website.id');

    if (this.isExpand(query, 'avatar')) {
      queryBuilder.leftJoinAndSelect('category.avatar', 'avatar');
    }

    this.setPagination(queryBuilder, query);
    this.setSort(queryBuilder, query, 'category', 'left');
    await this.setAlgoliaSearch(
      queryBuilder,
      query,
      this.algoliaCategoryService.search.bind(this.algoliaCategoryService),
      'category.id',
    );

    const [data, total] = await queryBuilder.getManyAndCount();

    if (this.isExpand(query, 'avatar')) {
      await this.imageService.mapVariantToImage(data, 'avatar');
    }

    if (this.isExpand(query, 'parent')) {
      await Promise.all(data.map(this.mapParentToCategory.bind(this)));
    }

    if (this.isExpand(query, 'children')) {
      await Promise.all(data.map(this.mapChildrenToCategory.bind(this)));
    }

    return this.generateGetAllResponse(data, total, query);
  }

  async create(body: CategoryCreateBodyDto) {
    const { parentId } = body;
    let category = null;

    if (!parentId) {
      category = await this.createRoot(body);
    } else {
      category = await this.createChild(body);
    }

    this.algoliaCategoryService.save({
      objectID: category.id,
      name: category.name,
    });
    await this.clearCache(body.websiteId);

    return category;
  }

  async update(id: number, body: CategoryUpdateBodyDto) {
    const existedCategory = await this.getOrFail({ id });
    const record = await this.categoryRepository.update(id, body);

    this.algoliaCategoryService.save({
      objectID: String(id),
      name: body.name,
    });
    await this.clearCache(existedCategory.websiteId);

    return record;
  }

  async delete(id: number) {
    const record = await this.getOrFail({ id });

    this.algoliaCategoryService.remove(String(id));
    await this.clearCache(record.websiteId);

    return this.categoryRepository.softDelete(id);
  }

  async mapParentToCategory(category: CategoryEntity) {
    const { left, right } = category;
    const allParents = await this.queryBuilder
      .where('"left" < :left', { left })
      .andWhere('"right" > :right', { right })
      .orderBy('"left"', 'DESC')
      .getMany();

    return this.recursiveMapParentToCategory(category, allParents);
  }

  /**
   * Map direct children to category and recursively map children to children.
   * @param {CategoryEntity} category
   * @returns {Promise<CategoryEntity>}
   */
  async mapChildrenToCategory(
    category: CategoryEntity,
    query: Record<string, unknown>,
  ): Promise<CategoryEntity> {
    const { left, right } = category;

    const getAllChildrenQuery: CategoryListQueryDto = {
      left,
      right,
    };
    const getAllChildrenQueryExpand = [];

    if (this.isExpand(query, 'children.avatar')) {
      getAllChildrenQueryExpand.push('avatar');
    }

    if (this.isExpand(query, 'children.parent')) {
      getAllChildrenQueryExpand.push('parent');
    }

    const { items: allChildren } = await this.getAll({
      ...getAllChildrenQuery,
      expands: getAllChildrenQueryExpand,
    });

    let prevChild = allChildren.find((child) => child.left === left + 1);
    const directChildren = [];

    while (prevChild) {
      directChildren.push(prevChild);

      const nextChild = allChildren.find((child) => child.left === prevChild.right + 1);

      if (!nextChild) {
        break;
      }

      prevChild = nextChild;
    }

    set(category, 'children', directChildren);

    await Promise.all(directChildren.map((child) => this.mapChildrenToCategory(child, query)));

    return category;
  }

  private recursiveMapParentToCategory(category: CategoryEntity, categories: CategoryEntity[]) {
    const parent = first(categories);

    if (!parent) {
      return category;
    }

    set(category, 'parent', parent);

    return this.recursiveMapParentToCategory(parent, categories.slice(1));
  }

  private async createRoot(body: CategoryCreateBodyDto) {
    const maxRight = await this.queryBuilder.select('MAX(category.right)', 'maxRight').getRawOne();

    const maxRightValue = maxRight ? maxRight.maxRight : 0;

    const category = this.categoryRepository.create({
      ...body,
      left: maxRightValue + 1,
      right: maxRightValue + 2,
    });

    return this.categoryRepository.save(category);
  }

  private async createChild(body: CategoryCreateBodyDto) {
    const { parentId } = body;

    const { right } = await this.getOrFail({ id: parentId });

    await this.queryBuilder
      .update()
      .set({ right: () => '"right" + 2' })
      .where('right >= :right', { right })
      .execute();

    await this.queryBuilder
      .update()
      .set({ left: () => '"left" + 2' })
      .where('left > :right', { right })
      .execute();

    const category = this.categoryRepository.create({
      ...body,
      left: right,
      right: right + 1,
    });

    return this.categoryRepository.save(category);
  }

  private isRoot(category: CategoryEntity, categories: CategoryEntity[]) {
    const { left, right } = category;
    const parent = categories.find(({ left: l, right: r }) => l < left && r > right);

    return !parent;
  }

  private get queryBuilder() {
    return this.categoryRepository
      .createQueryBuilder('category')
      .leftJoinAndSelect('category.website', 'website');
  }

  private clearCache(websiteId?: number) {
    return this.cacheService.clearCacheByPattern(MEM_CACHING_KEY_ENUM.CATEGORY, websiteId);
  }
}
