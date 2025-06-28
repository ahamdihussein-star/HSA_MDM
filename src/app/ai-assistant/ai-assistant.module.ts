import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AiAssistantRoutingModule } from './ai-assistant-routing.module';
import { AiAssistantComponent } from './ai-assistant.component';


import { FormsModule,ReactiveFormsModule} from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

@NgModule({
  declarations: [
    AiAssistantComponent
  ],
  imports: [
    CommonModule,
    AiAssistantRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    TranslateModule
  
  ],
  exports: [
    AiAssistantComponent
  ]
})
export class AiAssistantModule { }
