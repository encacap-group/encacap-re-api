import { Module } from '@nestjs/common';
import { AlgoliaConfigModule } from 'src/configs/algolia/algolia-config.module';
import { AppConfigModule } from 'src/configs/app/config.module';
import { AlgoliaCategoryService } from './services/algolia-category.service';
import { AlgoliaContactService } from './services/algolia-contact.service';
import { AlgoliaEstateService } from './services/algolia-estate.service';

@Module({
  imports: [AlgoliaConfigModule, AppConfigModule],
  controllers: [],
  providers: [AlgoliaCategoryService, AlgoliaContactService, AlgoliaEstateService],
  exports: [AlgoliaCategoryService, AlgoliaContactService, AlgoliaEstateService],
})
export class AlgoliaModule {}
