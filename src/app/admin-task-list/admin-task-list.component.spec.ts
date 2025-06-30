import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminTaskListComponent } from './admin-task-list.component';

describe('AdminTaskListComponent', () => {
  let component: AdminTaskListComponent;
  let fixture: ComponentFixture<AdminTaskListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AdminTaskListComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AdminTaskListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
