import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DuplicateRecordsComponent } from './duplicate-records.component';

describe('DuplicateRecordsComponent', () => {
  let component: DuplicateRecordsComponent;
  let fixture: ComponentFixture<DuplicateRecordsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DuplicateRecordsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DuplicateRecordsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
