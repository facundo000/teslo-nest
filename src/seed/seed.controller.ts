import { Controller, Get} from '@nestjs/common';
import { SeedService } from './seed.service';

@Controller('seed')
export class SeedController {
  constructor(private readonly SeedService: SeedService) {}

  @Get()
  executedSeed() {
    return this.SeedService.runSeed();
  }
  
}
