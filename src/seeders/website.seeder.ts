import { IWebsite, WEBSITE_DOMAIN_ENUM } from '@encacap-group/common/dist/re';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Seeder } from 'nestjs-seeder';
import { WebsiteEntity } from 'src/modules/website/entities/website.entity';
import { Repository } from 'typeorm';

export const websiteItems: Array<Partial<IWebsite>> = [
  {
    name: 'Encacap RE',
    url: WEBSITE_DOMAIN_ENUM.ENCACAP_RE,
    description: 'This is the supper root website. It can be used to manage all the websites.',
  },
];

@Injectable()
export class WebsiteSeeder implements Seeder {
  constructor(
    @InjectRepository(WebsiteEntity) private readonly websiteRepository: Repository<WebsiteEntity>,
  ) {}

  async upsertItem(item: Partial<IWebsite>) {
    const record = await this.websiteRepository.findOneBy({ url: item.url });

    if (record) {
      return this.websiteRepository.update(record.id, item);
    }

    return this.websiteRepository.save(item);
  }

  seed() {
    const seedTasks = websiteItems.map((item) => this.upsertItem(item));
    return Promise.all(seedTasks);
  }

  drop() {
    return this.websiteRepository.delete({});
  }
}
