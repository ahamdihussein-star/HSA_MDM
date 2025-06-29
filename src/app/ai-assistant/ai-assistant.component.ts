import { Component , ViewChild, ElementRef, AfterViewChecked, ViewEncapsulation} from '@angular/core';
interface ChatMessage {
  from: 'bot' | 'user';
  text: string;
  align?: 'left' | 'right';

}
@Component({
  selector: 'app-ai-assistant',
  templateUrl: './ai-assistant.component.html',
  styleUrl: './ai-assistant.component.scss',
  encapsulation: ViewEncapsulation.None, // Use None to avoid view encapsulation issues

})
export class AiAssistantComponent implements AfterViewChecked{
   messages: ChatMessage[] = [];
  currentInput = '';
  currentStep = 0;
  customer: any = {};

  fields = [
    { key: 'firstName', label: "What's the customer's first name?" },
    { key: 'secondName', label: "What's the customer's second name?" },
    { key: 'street', label: "What's the street address?" },
    { key: 'postalCode', label: "What's the postal code?" },
    { key: 'city', label: "Which city?" },
    { key: 'region', label: "Which region?" },
    { key: 'country', label: "Which country?" },  
    { key: 'tax', label: "What's the tax status?" },
    { key: 'identificationCountry', label: "Identification country?" },
    { key: 'responsible', label: "Who's responsible?" },
    { key: 'dateFrom', label: "Enter date from (MM/DD/YYYY)" },
    { key: 'dateTo', label: "Enter date to (MM/DD/YYYY)" },  
    { key: 'salesOrg', label: "Sales organization?" },
    { key: 'distributionChannel', label: "Distribution channel?" },
    { key: 'division', label: "Division?" }
  ];
   isChatOpen = false;

    @ViewChild('chatContainer') private chatContainer!: ElementRef;

  

  constructor() {
    this.addBotMessage("Hello! I'm your MDM AI Assistant. Say 'create new customer' to begin.");
  }

 

toggleChat() {
  this.isChatOpen = !this.isChatOpen;
}
  sendMessage() {
  const input = this.currentInput.trim();
  if (!input) return;

  this.addUserMessage(input);

  if (this.currentStep === 0 && input.toLowerCase().includes('create new customer')) {
    this.currentStep = 1;
    this.addBotMessage(this.fields[0].label);
  } else if (this.currentStep > 0 && this.currentStep <= this.fields.length) {
    const field = this.fields[this.currentStep - 1];

    // ✅ Validate date fields
    if ((field.key === 'dateFrom' || field.key === 'dateTo') && !this.isValidDate(input)) {
      this.addBotMessage(`❌ Invalid date format. Please enter date as MM/DD/YYYY.`);
      this.currentInput = '';
      return;
    }

    this.customer[field.key] = input;
    this.currentStep++;

    if (this.currentStep <= this.fields.length) {
      this.addBotMessage(this.fields[this.currentStep - 1].label);
    } else {
      this.addBotMessage('✅ Customer created successfully!');
      console.log('Customer Data:', this.customer);
      this.currentStep = 0;
    }
  } else {
    this.addBotMessage("Say 'create new customer' to begin the form.");
  }

  this.currentInput = '';
}

  addBotMessage(text: string) {
    this.messages.push({ from: 'bot', text });
  }

  addUserMessage(text: string) {
    this.messages.push({ from: 'user', text });
  }
  isValidDate(input: string): boolean {
  // MM/DD/YYYY format
  const regex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/\d{4}$/;
  if (!regex.test(input)) return false;

  const date = new Date(input);
  return !isNaN(date.getTime());
}

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }
  scrollToBottom(): void {
    try {
      this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight;
    } catch (err) {}
  }
}
