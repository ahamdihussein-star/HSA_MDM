import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QuarantinedRequestsComponent } from './quarantined-requests.component';

describe('QuarantinedRequestsComponent', () => {
  let component: QuarantinedRequestsComponent;
  let fixture: ComponentFixture<QuarantinedRequestsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [QuarantinedRequestsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(QuarantinedRequestsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
