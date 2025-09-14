import { BrowserModule, provideClientHydration } from '@angular/platform-browser';
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

// Repository imports - Updated to use ApiRepo
import { DATA_REPO } from './Core/data-repo';
import { ApiRepo } from './Core/api.repo';

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
    RouterModule.forRoot([], { initialNavigation: 'enabledBlocking' }),
    TranslateModule.forRoot({
      defaultLanguage: 'en',
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient]
      }
    }),
    BrowserAnimationsModule
  ],
  providers: [
    provideClientHydration(),
    ApiRepo,
    { provide: DATA_REPO, useExisting: ApiRepo }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {
  constructor() {}
}