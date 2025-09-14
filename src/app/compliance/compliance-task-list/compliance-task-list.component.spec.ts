import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ComplianceTaskListComponent } from './compliance-task-list.component';

describe('ComplianceTaskListComponent', () => {
  let component: ComplianceTaskListComponent;
  let fixture: ComponentFixture<ComplianceTaskListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ComplianceTaskListComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ComplianceTaskListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
