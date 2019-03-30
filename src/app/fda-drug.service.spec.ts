import { TestBed } from '@angular/core/testing';

import { FdaDrugService } from './fda-drug.service';

describe('FdaDrugService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: FdaDrugService = TestBed.get(FdaDrugService);
    expect(service).toBeTruthy();
  });
});
