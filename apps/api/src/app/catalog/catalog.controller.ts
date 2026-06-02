import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CatalogService } from './catalog.service';
import { RateLimit } from '../common/rate-limit';

/**
 * Araç & servis kataloğu — herkese açık okuma (auth gerekmez).
 * Araçlar ekranındaki Chip Tuning sekmesini besler.
 * Açık uç olduğundan IP başına sıkı limit (scraping'e karşı).
 */
@ApiTags('catalog')
@RateLimit({ limit: 100, window: 60, hard: 400, block: 900, name: 'catalog' })
@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('brands')
  @ApiOperation({ summary: 'Tüm markaları listele' })
  brands() {
    return this.catalog.listBrands();
  }

  @Get('models')
  @ApiOperation({ summary: 'Markaya ait modelleri listele' })
  @ApiQuery({ name: 'brandId', required: true })
  models(@Query('brandId') brandId: string) {
    return this.catalog.listModels(brandId);
  }

  @Get('series')
  @ApiOperation({ summary: 'Modele ait nesilleri listele' })
  @ApiQuery({ name: 'modelId', required: true })
  series(@Query('modelId') modelId: string) {
    return this.catalog.listSeries(modelId);
  }

  @Get('engines')
  @ApiOperation({ summary: 'Nesle ait motorları (güç değerleriyle) listele' })
  @ApiQuery({ name: 'seriesId', required: true })
  engines(@Query('seriesId') seriesId: string) {
    return this.catalog.listEngines(seriesId);
  }

  @Get('services')
  @ApiOperation({ summary: 'Modül & ek servis kataloğu' })
  services() {
    return this.catalog.listServices();
  }

  @Get('modified-parts')
  @ApiOperation({ summary: 'Değiştirilmiş parça referans listesi' })
  modifiedParts() {
    return this.catalog.listModifiedParts();
  }

  @Get('tuning-prices')
  @ApiOperation({ summary: 'Stage taban fiyatları' })
  tuningPrices() {
    return this.catalog.listTuningPrices();
  }
}
