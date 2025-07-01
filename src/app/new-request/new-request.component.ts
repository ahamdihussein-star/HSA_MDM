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

  constructor(
    private fb: FormBuilder,
    private i18n: NzI18nService,
    private route: ActivatedRoute,
    private notification: NzNotificationService,
    private translate: TranslateService,
    private router: Router,
    private location: Location,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

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
        this.router.navigate(["/dashboard/my-requests"]);
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
    this.requestForm.get("tax")?.enable();
    this.requestForm.get("identityCountry")?.enable();
    this.requestForm.get("resbonsible")?.enable();
  }

  ngOnInit(): void {
    this.i18n.setLocale(en_US);

    this.requestForm = this.fb.group({
      firstName: [null, Validators.required],
      secondName: [null, Validators.required],
      street: [null, Validators.required],
      postalCode: [null, Validators.required],
      city: [null, Validators.required],
      region: [null, Validators.required],
      country: [null, Validators.required],

      tax: [null, Validators.required],
      identityCountry: [null, Validators.required],
      resbonsible: [null, Validators.required],
      dateFrom: [null, Validators.required],
      dateTo: [null, Validators.required],

      salesOrg: [null, Validators.required],
      distChannel: [null, Validators.required],
      division: [null, Validators.required],
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
