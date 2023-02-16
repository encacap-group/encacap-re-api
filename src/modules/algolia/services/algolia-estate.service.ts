import { Injectable } from '@nestjs/common';
import algoliasearch, { SearchClient, SearchIndex } from 'algoliasearch';
import { isNil, omitBy } from 'lodash';
import { LoggerService } from 'src/common/modules/logger/logger.service';
import { AlgoliaConfigService } from 'src/configs/algolia/algolia-config.service';
import AppConfigService from 'src/configs/config.service';
import { IAlgoliaEstate } from '../interfaces/algolia.interface';

@Injectable()
export class AlgoliaEstateService {
  private readonly client: SearchClient;
  private index: SearchIndex;
  private logger = new LoggerService(AlgoliaEstateService.name);

  constructor(
    private readonly algoliaConfigService: AlgoliaConfigService,
    private readonly appConfigService: AppConfigService,
  ) {
    this.client = algoliasearch(this.algoliaConfigService.appID, this.algoliaConfigService.apiKey);
    this.index = this.client.initIndex(`${this.appConfigService.envAlias}_estate`);
    this.index
      .setSettings({
        searchableAttributes: [
          'title',
          'description',
          'address',
          'wardName',
          'districtName',
          'provinceName',
          'customId',
        ],
      })
      .catch((error) => {
        this.logger.error(error);
      });
  }

  save(item: IAlgoliaEstate) {
    this.index.saveObject(item);
  }

  update(item: IAlgoliaEstate) {
    this.index.partialUpdateObject(omitBy(item, isNil));
  }

  remove(categoryCode: string) {
    this.index.deleteObject(categoryCode);
  }

  search(query: string, retrieveAttributes?: string[]) {
    return this.index.search<IAlgoliaEstate>(query, {
      attributesToRetrieve: retrieveAttributes,
    });
  }
}