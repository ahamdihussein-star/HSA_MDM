import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GoldenRequestsComponent } from './golden-requests.component';

describe('GoldenRequestsComponent', () => {
  let component: GoldenRequestsComponent;
  let fixture: ComponentFixture<GoldenRequestsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [GoldenRequestsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(GoldenRequestsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
