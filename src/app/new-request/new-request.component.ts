import { Location, isPlatformBrowser } from "@angular/common";
import { Component, Inject, PLATFORM_ID, ViewEncapsulation } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { TranslateService } from "@ngx-translate/core";
import { NzI18nService, en_US } from "ng-zorro-antd/i18n";
import { NzNotificationService } from "ng-zorro-antd/notification";

@Component({
  selector: "app-new-request",
  templateUrl: "./new-request.component.html",
  styleUrl: "./new-request.component.scss",
  encapsulation: ViewEncapsulation.None,
})
export class NewRequestComponent {
  requestForm!: FormGroup;
  canEdit: Boolean = false;
  canView: Boolean = false;
  status = "Rejected";
  editPressed = false;
  isArabic = false;

  taxOptions = [
    { value: "1", label: "Tax" },
    { value: "2", label: "Commercial" },
  ];
  userType: any;
  isApprovedVisible: any = false;
  approvedChecked = true;
  isRejectedVisible = false;
  rejectedChecked = true;
  inputValue?: string;
  isRejectedConfirmVisible: any;
  isAssignVisible: any = false
  selectedDepartment: any;
   constructor(
    private fb: FormBuilder,
    private i18n: NzI18nService,
    private route: ActivatedRoute,
    private notification: NzNotificationService,
    private translate: TranslateService,
    private router: Router,
    private location: Location,
    @Inject(PLATFORM_ID) private platformId: Object
  ) { }

  onSubmit(): void {
    if (this.requestForm.valid) {
      let toastMessage: string = "New Request is added successfully";
      if (this.canEdit) {
        toastMessage = "The Request is edited successfully";
      }
      this.translate.get(toastMessage).subscribe((message: string) => {
        this.notification.create("success", message, "", {
          nzClass: "success-notification",
          nzDuration: 5000,
        });
        this.location.back();
      });
    } else {
      Object.values(this.requestForm.controls).forEach((control) => {
        if (control.invalid) {
          control.markAsDirty();
          control.updateValueAndValidity({ onlySelf: true });
        }
      });
    }
  }

  rejectApprove() {
    this.isRejectedConfirmVisible = false;
    let toastMessage: string = "New Request is rejected successfully";
    this.translate.get(toastMessage).subscribe((message: string) => {
      this.notification.create("success", message, "", {
        nzClass: "success-notification",
        nzDuration: 5000,
      });
    });
    this.location.back();

  }
  confirmReject(): void {

    this.isRejectedVisible = false
    this.isRejectedConfirmVisible = true;
    this.inputValue = '';
  }
  handleCancel(): void {
    console.log('Button cancel clicked!');
    this.isApprovedVisible = false;
    this.isRejectedVisible = false;
    this.isRejectedConfirmVisible = false
    this.isAssignVisible = false
    this.inputValue = '';

  }
  showRejectedModal(): void {
    this.isRejectedVisible = true;
  }
  showAssignModal(): void {
    this.isAssignVisible = true;
  }
  handleOk(): void {
    console.log('Button ok clicked!');
    this.isApprovedVisible = false;
    this.isRejectedVisible = false;
    this.isRejectedConfirmVisible = false
    this.isAssignVisible = false
    this.inputValue = '';

  }
  assignToBtn() {
    this.location.back();
    let toastMessage: string = "New Request is Assigned successfully";
    this.translate.get(toastMessage).subscribe((message: string) => {
      this.notification.create("success", message, "", {
        nzClass: "success-notification",
        nzDuration: 5000,
      });
    });
  }
  submitApprove() {
    this.isApprovedVisible = false;
    this.location.back();
    let toastMessage: string = "New Request is added successfully";
    this.translate.get(toastMessage).subscribe((message: string) => {
      this.notification.create("success", message, "", {
        nzClass: "success-notification",
        nzDuration: 5000,
      });
    });

  }

  showApproveModal(): void {
    this.isApprovedVisible = true;
  }

  goBack(): void {
    this.location.back();
  }

  fillForm(): void {
    this.requestForm.patchValue({
      firstName: "John",
      secondName: "Doe",
      street: "123 Main St",
      postalCode: "12345",
      city: "Anytown",
      region: "Anystate",
      country: "USA",

      tax: "2",
      identityCountry: "USA",
      resbonsible: "Jane Smith",
      dateFrom: new Date(),
      dateTo: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),

      salesOrg: "Sales Org 1",
      distChannel: "Distribution Channel 1",
      division: "Division 1",
    });

    this.requestForm.disable();
  }

  editRequest(): void {
    this.editPressed = true;
    this.requestForm.enable();
  }
  RequestChange(): void {
    this.location.back();
    let toastMessage: string = "Your request has been sent back for modification";
    this.translate.get(toastMessage).subscribe((message: string) => {
      this.notification.create("success", message, "", {
        nzClass: "success-notification",
        nzDuration: 5000,
      });
    });
  }

  ngOnInit(): void {
    this.userType = localStorage.getItem("user")
    this.i18n.setLocale(en_US);

    this.requestForm = this.fb.group({
      firstName: [null, Validators.required],
      secondName: [null, Validators.required],
      street: [null],
      postalCode: [null],
      city: [null],
      region: [null],
      country: [null],

      tax: [null],
      identityCountry: [null],
      resbonsible: [null],
      dateFrom: [null],
      dateTo: [null],

      salesOrg: [null],
      distChannel: [null],
      division: [null],
    });

    this.route.queryParams.subscribe((params) => {
      const canEdit = params["edit"] === "true";
      const canView = params["edit"] === "false";
      const status = params["status"];

      this.status = status;
      this.canEdit = canEdit;
      this.canView = canView;

      if (canEdit || canView) {
        this.requestForm.disable();
        this.fillForm();
      }
    });


    if (isPlatformBrowser(this.platformId)) {
      this.isArabic = localStorage.getItem("lang") == "ar";
    }
  }
}
