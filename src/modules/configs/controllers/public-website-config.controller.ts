import { IWebsite } from '@encacap-group/types/dist/re';
import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { BaseCodeParamDto } from 'src/base/base.dto';
import { Website } from 'src/common/decorators/website-id.decorator';
import { WebsiteApiKeyGuard } from 'src/common/guards/website-api-key.guard';
import { WebsiteConfigListQueryDto } from '../dtos/website-config-list-query.dto';
import { WebsiteConfigService } from '../services/website-config.service';

@UseGuards(WebsiteApiKeyGuard)
@Controller('public/website-configs')
export class PublicWebsiteConfigController {
  constructor(private readonly configService: WebsiteConfigService) {}

  @Get()
  async getConfigs(@Query() query: WebsiteConfigListQueryDto, @Website() website: IWebsite) {
    return this.configService.getAll({
      ...query,
      websiteId: website.id,
    });
  }

  @Get(':code')
  async getConfig(@Website() website: IWebsite, @Param() param: BaseCodeParamDto) {
    return this.configService.get({
      code: param.code,
      websiteId: website.id,
    });
  }
}
