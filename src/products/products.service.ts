import { BadRequestException, Injectable, InternalServerErrorException, Logger, Get, NotFoundException, Query } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PaginationDto } from '../common/dtos/pagination.dto';

import { Product, ProductImages } from './entities/index';
import { validate as isUUID }  from 'uuid';

@Injectable()

export class ProductsService {

  private readonly logger = new Logger()

  constructor(

    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,

    @InjectRepository(ProductImages)
    private readonly productImagesRepository: Repository<ProductImages>,

    private readonly datasource: DataSource,

  ) {}

  async create(createProductDto: CreateProductDto) {
    
    try {
      const { images = [], ...productDetails  } = createProductDto;

      const product = this.productRepository.create({
        ...createProductDto,
        images: images.map( image => this.productImagesRepository.create({ url: image }) ),
      });
      
      await this.productRepository.save( product ); //Lo guarda en la base de datos

      return { ...product, images };

    } catch(error) {
      this.handleDExceptions(error);
    }
    
  }

  async findAll( paginationDto: PaginationDto ){

    const { limit = 10, offset = 0 } = paginationDto;

    const products = await this.productRepository.find({
      take: limit,
      skip: offset,
      relations: {
        images: true,
      }
    });

    return products.map( ( product ) => ({ 
      ...product, 
      images: product.images.map( image => image.url )
     }))
  }

  async findOne(term: string) {
    
    let product : Product;

    if( isUUID(term) ){
      product = await this.productRepository.findOneBy({ id: term });
    } else {
      const queryBuilder = this.productRepository.createQueryBuilder('prod');

      const termLower = term.toLocaleLowerCase().trim()

      product = await queryBuilder
      .where(' UPPER(title) = :title or slug = :slug', {
         title: termLower,
         slug: termLower
         })
         .leftJoinAndSelect('prod.images','prodImages')
         .getOne();
      }

    if( !product )
      throw new BadRequestException(`Product with id: '${ term }' not found`);
    return product;
  }

  async findOnePlain( term: string ) {
    const { images = [], ...rest } = await this.findOne( term );

    return {
      ...rest,
      images: images.map( image => image.url )
    }
  }

  async update(id: string, updateProductDto: UpdateProductDto) {

    const { images, ...toUpdate } = updateProductDto;


    const product = await this.productRepository.preload({ id, ...toUpdate });

    if( !product )
      throw new NotFoundException(`Product with id: '${ id }' not found`);
    
    // create query runner
    const queryRunner = this.datasource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {

      if( images ) {
        await queryRunner.manager.delete( ProductImages, { product: { id } } );

        product.images = images.map( 
          image => this.productImagesRepository.create({ url: image }) 
        )
      }

      await queryRunner.manager.save( product );
      // await this.productRepository.save( product );

      await queryRunner.commitTransaction();
      await queryRunner.release();

      return this.findOnePlain( id );    
    } catch(error) {

      await queryRunner.rollbackTransaction();
      await queryRunner.release();

      this.handleDExceptions(error);
    }

  }

  async remove(id: string) {
  
    const product = await this.findOne(id);
    await this.productRepository.remove( product );
    
    return {deleted: true};
  }

  private handleDExceptions( error: any ) {
    if( error.code == '23505' )
        throw new BadRequestException(error.detail);

      this.logger.error(error)
      // console.log(error)
      throw new InternalServerErrorException('Unexpected error, check server logs');
    }

  async deleteAllProducts() {
    const query = this.productRepository.createQueryBuilder('product');

    try {
      return await query
      .delete()
      .where({})
      .execute();
      
    } catch(error) {
      this.handleDExceptions(error);
    }
  }
}
