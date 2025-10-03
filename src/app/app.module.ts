import { BrowserModule } from '@angular/platform-browser';
import { RouterOutlet, RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

import {
  TranslateLoader,
  TranslateModule
} from '@ngx-translate/core';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

// Ant Design Locale Configuration
import { NZ_I18N, en_US } from 'ng-zorro-antd/i18n';
import { registerLocaleData } from '@angular/common';
import en from '@angular/common/locales/en';

// Repository imports - Updated to use ApiRepo
import { DATA_REPO } from './Core/data-repo';
import { ApiRepo } from './Core/api.repo';
import { NotificationService } from './services/notification.service';
import { PdfBulkGeneratorModule } from './pdf-bulk-generator/pdf-bulk-generator.module';
registerLocaleData(en);


export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    HttpClientModule,
    AppRoutingModule,
    RouterOutlet,
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient]
      }
    }),
    BrowserAnimationsModule,
    PdfBulkGeneratorModule
  ],
  providers: [
    ApiRepo,
    { provide: DATA_REPO, useExisting: ApiRepo },
    { provide: NZ_I18N, useValue: en_US },
    NotificationService
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}