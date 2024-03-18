import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Product, ProductImages } from './entities/index';

@Module({
  controllers: [ProductsController],
  providers: [ProductsService],
  imports: [
    TypeOrmModule.forFeature([ Product, ProductImages])
  ],
  exports: [
    ProductsService,
    TypeOrmModule
  ]
})
export class ProductsModule {}
