import { Component, Inject, PLATFORM_ID } from "@angular/core";
import { TranslateService } from "@ngx-translate/core";
import { isPlatformBrowser } from "@angular/common";
@Component({
  selector: "app-header",
  templateUrl: "./header.component.html",
  styleUrl: "./header.component.scss",
})
export class HeaderComponent {
  lang: string = "";
  user:string = "";

  constructor(
    private translate: TranslateService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  switchLang(lang: string) {
    // console.log(this.langSelect, "|||this.langSelect");
    if (lang == "en") {
      localStorage.setItem("lang", "en");

      this.translate.use("en");
      this.lang = "en";
      location.reload();
    } else if (lang == "ar") {
      this.translate.use("ar");
      localStorage.setItem("lang", "ar");
      this.lang = "ar";
      location.reload();
    }
  }

  ngOnInit(): void {
    this.lang = localStorage.getItem("lang") || "en";
    this.user = localStorage.getItem("user")  || "2"; 
  }
}
