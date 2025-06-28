import { Component } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";

@Component({
  selector: "app-new-request",
  templateUrl: "./new-request.component.html",
  styleUrl: "./new-request.component.scss",
})
export class NewRequestComponent {
  requestForm!: FormGroup;

  constructor(private fb: FormBuilder) {}

  onSubmit(): void {
    if (this.requestForm.valid) {

    } else {
      Object.values(this.requestForm.controls).forEach((control) => {
        if (control.invalid) {
          control.markAsDirty();
          control.updateValueAndValidity({ onlySelf: true });
        }
      });
    }
  }

  ngOnInit(): void {
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

      salesOrg: [null, Validators.required],
      distChannel: [null, Validators.required],
      division: [null, Validators.required]
    });
  }
}
