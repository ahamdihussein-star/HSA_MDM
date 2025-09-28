
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { AiAssistantRoutingModule } from './ai-assistant-routing.module';
import { AiAssistantComponent } from './ai-assistant.component';

import { FormsModule,ReactiveFormsModule} from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Router } from "@angular/router";
import { HttpClientModule } from '@angular/common/http';

@NgModule({
  declarations: [
    AiAssistantComponent
  ],
  imports: [
    CommonModule,
    AiAssistantRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    TranslateModule,
    HttpClientModule
  ],
  exports: [
    AiAssistantComponent
  ]
})
export class AiAssistantModule {
    constructor() {
    }
 }
