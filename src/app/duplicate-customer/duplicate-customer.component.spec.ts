import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DuplicateCustomerComponent } from './duplicate-customer.component';

describe('DuplicateCustomerComponent', () => {
  let component: DuplicateCustomerComponent;
  let fixture: ComponentFixture<DuplicateCustomerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DuplicateCustomerComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DuplicateCustomerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
