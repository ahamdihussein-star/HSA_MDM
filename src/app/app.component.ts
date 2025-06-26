import { Component, OnInit, ViewEncapsulation , Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class AppComponent {
  title = 'master-data-mangment';
  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private translate: TranslateService
  ) {}

  

   onActivate(event: any): void {
     if (isPlatformBrowser(this.platformId)) {
    window.scroll(0, 0);
    document.body.scrollTop = 0;
    }
  }
  ngOnInit(): void {
    
     if (isPlatformBrowser(this.platformId)) {
      const lang = localStorage.getItem("lang") || "en";
      console.log(lang , "||||lang")
      if (lang == "ar") {
        document.body.classList.add("rtl");
        document.body.classList.remove("ltr");
        
        this.translate.use('ar');
        // console.log(lang , "||||lang in arabic")
      } else {
        document.body.classList.add("ltr");
        document.body.classList.remove("rtl");
        
        this.translate.use('en');
        // console.log(lang , "||||lang in english")
      }
    }
  }
}


