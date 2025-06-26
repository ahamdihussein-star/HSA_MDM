import { Component, OnInit,ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from "@angular/router";

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class LoginComponent {

 loginForm!: FormGroup;

  constructor(private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  

  onSubmit(): void {
    if (this.loginForm.valid) {

      const emailValue = this.loginForm.value.email;

      if (emailValue && emailValue.includes('user')) {
        localStorage.setItem('user', "1");
        this.router.navigate(["/dashboard", "my-task"]);
      } else if (emailValue && emailValue.includes('admin')) {
  
        localStorage.setItem('user', "2");
        this.router.navigate(["/dashboard", "home"]);
      }

    } else {
      this.loginForm.markAllAsTouched();
    }
  
  }

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      email: [null, [Validators.required, Validators.email]],
      password: ['', Validators.required],
    });
  }
  
}