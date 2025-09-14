import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GoldenSummaryComponent } from './golden-summary.component';

describe('GoldenSummaryComponent', () => {
  let component: GoldenSummaryComponent;
  let fixture: ComponentFixture<GoldenSummaryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [GoldenSummaryComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(GoldenSummaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
