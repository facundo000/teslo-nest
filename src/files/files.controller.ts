import { Controller, Get, Post, Param, UploadedFile, UseInterceptors, BadRequestException, Res } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FilesService } from './files.service';
import { diskStorage } from 'multer';
import { Response } from 'express';
import { fileFilter, fileNamer } from './helpers/index';
import { ConfigService } from '@nestjs/config';

@Controller('files')
export class FilesController {
  constructor(
    private readonly filesService: FilesService,
    private readonly configService: ConfigService
    ) {}

  @Get('product/:imageName') 
    findProductImage(
      @Res() res: Response,
      @Param('imageName') imageName: string
    ) {

      const path =  this.filesService.getStaticProductImage( imageName );

      res.sendFile( path );

      // return path;
    }
  

  @Post('product')
  @UseInterceptors( FileInterceptor('file', { 
    fileFilter: fileFilter,
    storage: diskStorage({
      destination: './static/products',
      filename: fileNamer
    })
   }) )
  uploadProductImage( 
    @UploadedFile() file: Express.Multer.File,
  ) {

    if( !file ) {
      throw new BadRequestException('Make sure that the file is an image');
    }
    // console.log(file);

    const secureUrl = `${ this.configService.get('HOST_API') }/files/product/${ file.filename }`;
    // console.log(secureUrl)

    return {
      secureUrl
    };
  }
}
