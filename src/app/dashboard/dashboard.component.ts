import {
  Component,
  ViewEncapsulation,
  Inject,
  PLATFORM_ID,
} from "@angular/core";
import { isPlatformBrowser } from "@angular/common";
import { Router } from "@angular/router";

@Component({
  selector: "app-dashboard",
  templateUrl: "./dashboard.component.html",
  styleUrl: "./dashboard.component.scss",
  encapsulation: ViewEncapsulation.None,
})
export class DashboardComponent {
  user: any;
  constructor(@Inject(PLATFORM_ID) private platformId: Object , public router: Router) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.user = localStorage.getItem("user");
    }
  }
}
