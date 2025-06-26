import {
  NzIconDirective,
  NzIconModule
} from "./chunk-JEITTEF2.js";
import {
  CommonModule,
  NgIf
} from "./chunk-BISF4KSR.js";
import {
  BehaviorSubject,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Directive,
  Injectable,
  Input,
  NgModule,
  ReplaySubject,
  TemplateRef,
  ViewContainerRef,
  ViewEncapsulation$1,
  setClassMetadata,
  ɵɵNgOnChangesFeature,
  ɵɵclassProp,
  ɵɵdefineComponent,
  ɵɵdefineDirective,
  ɵɵdefineInjectable,
  ɵɵdefineInjector,
  ɵɵdefineNgModule,
  ɵɵdirectiveInject,
  ɵɵelement,
  ɵɵnextContext,
  ɵɵproperty,
  ɵɵtemplate
} from "./chunk-W73O34SA.js";

// node_modules/ng-zorro-antd/fesm2022/ng-zorro-antd-core-form.mjs
function NzFormItemFeedbackIconComponent_span_0_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵelement(0, "span", 1);
  }
  if (rf & 2) {
    const ctx_r0 = ɵɵnextContext();
    ɵɵproperty("nzType", ctx_r0.iconType);
  }
}
var NzFormStatusService = class _NzFormStatusService {
  constructor() {
    this.formStatusChanges = new ReplaySubject(1);
  }
  static {
    this.ɵfac = function NzFormStatusService_Factory(t) {
      return new (t || _NzFormStatusService)();
    };
  }
  static {
    this.ɵprov = ɵɵdefineInjectable({
      token: _NzFormStatusService,
      factory: _NzFormStatusService.ɵfac
    });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(NzFormStatusService, [{
    type: Injectable
  }], null, null);
})();
var NzFormNoStatusService = class _NzFormNoStatusService {
  constructor() {
    this.noFormStatus = new BehaviorSubject(false);
  }
  static {
    this.ɵfac = function NzFormNoStatusService_Factory(t) {
      return new (t || _NzFormNoStatusService)();
    };
  }
  static {
    this.ɵprov = ɵɵdefineInjectable({
      token: _NzFormNoStatusService,
      factory: _NzFormNoStatusService.ɵfac
    });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(NzFormNoStatusService, [{
    type: Injectable
  }], null, null);
})();
var iconTypeMap = {
  error: "close-circle-fill",
  validating: "loading",
  success: "check-circle-fill",
  warning: "exclamation-circle-fill"
};
var NzFormItemFeedbackIconComponent = class _NzFormItemFeedbackIconComponent {
  constructor(cdr) {
    this.cdr = cdr;
    this.status = "";
    this.iconType = null;
  }
  ngOnChanges(_changes) {
    this.updateIcon();
  }
  updateIcon() {
    this.iconType = this.status ? iconTypeMap[this.status] : null;
    this.cdr.markForCheck();
  }
  static {
    this.ɵfac = function NzFormItemFeedbackIconComponent_Factory(t) {
      return new (t || _NzFormItemFeedbackIconComponent)(ɵɵdirectiveInject(ChangeDetectorRef));
    };
  }
  static {
    this.ɵcmp = ɵɵdefineComponent({
      type: _NzFormItemFeedbackIconComponent,
      selectors: [["nz-form-item-feedback-icon"]],
      hostAttrs: [1, "ant-form-item-feedback-icon"],
      hostVars: 8,
      hostBindings: function NzFormItemFeedbackIconComponent_HostBindings(rf, ctx) {
        if (rf & 2) {
          ɵɵclassProp("ant-form-item-feedback-icon-error", ctx.status === "error")("ant-form-item-feedback-icon-warning", ctx.status === "warning")("ant-form-item-feedback-icon-success", ctx.status === "success")("ant-form-item-feedback-icon-validating", ctx.status === "validating");
        }
      },
      inputs: {
        status: "status"
      },
      exportAs: ["nzFormFeedbackIcon"],
      features: [ɵɵNgOnChangesFeature],
      decls: 1,
      vars: 1,
      consts: [["nz-icon", "", 3, "nzType", 4, "ngIf"], ["nz-icon", "", 3, "nzType"]],
      template: function NzFormItemFeedbackIconComponent_Template(rf, ctx) {
        if (rf & 1) {
          ɵɵtemplate(0, NzFormItemFeedbackIconComponent_span_0_Template, 1, 1, "span", 0);
        }
        if (rf & 2) {
          ɵɵproperty("ngIf", ctx.iconType);
        }
      },
      dependencies: [NgIf, NzIconDirective],
      encapsulation: 2,
      changeDetection: 0
    });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(NzFormItemFeedbackIconComponent, [{
    type: Component,
    args: [{
      selector: "nz-form-item-feedback-icon",
      exportAs: "nzFormFeedbackIcon",
      preserveWhitespaces: false,
      encapsulation: ViewEncapsulation$1.None,
      changeDetection: ChangeDetectionStrategy.OnPush,
      template: ` <span *ngIf="iconType" nz-icon [nzType]="iconType"></span> `,
      host: {
        class: "ant-form-item-feedback-icon",
        "[class.ant-form-item-feedback-icon-error]": 'status==="error"',
        "[class.ant-form-item-feedback-icon-warning]": 'status==="warning"',
        "[class.ant-form-item-feedback-icon-success]": 'status==="success"',
        "[class.ant-form-item-feedback-icon-validating]": 'status==="validating"'
      }
    }]
  }], () => [{
    type: ChangeDetectorRef
  }], {
    status: [{
      type: Input
    }]
  });
})();
var NzFormPatchModule = class _NzFormPatchModule {
  static {
    this.ɵfac = function NzFormPatchModule_Factory(t) {
      return new (t || _NzFormPatchModule)();
    };
  }
  static {
    this.ɵmod = ɵɵdefineNgModule({
      type: _NzFormPatchModule,
      declarations: [NzFormItemFeedbackIconComponent],
      imports: [CommonModule, NzIconModule],
      exports: [NzFormItemFeedbackIconComponent]
    });
  }
  static {
    this.ɵinj = ɵɵdefineInjector({
      imports: [CommonModule, NzIconModule]
    });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(NzFormPatchModule, [{
    type: NgModule,
    args: [{
      imports: [CommonModule, NzIconModule],
      exports: [NzFormItemFeedbackIconComponent],
      declarations: [NzFormItemFeedbackIconComponent]
    }]
  }], null, null);
})();

// node_modules/ng-zorro-antd/fesm2022/ng-zorro-antd-core-outlet.mjs
var NzStringTemplateOutletDirective = class _NzStringTemplateOutletDirective {
  static ngTemplateContextGuard(_dir, _ctx) {
    return true;
  }
  recreateView() {
    this.viewContainer.clear();
    const isTemplateRef = this.nzStringTemplateOutlet instanceof TemplateRef;
    const templateRef = isTemplateRef ? this.nzStringTemplateOutlet : this.templateRef;
    this.embeddedViewRef = this.viewContainer.createEmbeddedView(templateRef, isTemplateRef ? this.nzStringTemplateOutletContext : this.context);
  }
  updateContext() {
    const isTemplateRef = this.nzStringTemplateOutlet instanceof TemplateRef;
    const newCtx = isTemplateRef ? this.nzStringTemplateOutletContext : this.context;
    const oldCtx = this.embeddedViewRef.context;
    if (newCtx) {
      for (const propName of Object.keys(newCtx)) {
        oldCtx[propName] = newCtx[propName];
      }
    }
  }
  constructor(viewContainer, templateRef) {
    this.viewContainer = viewContainer;
    this.templateRef = templateRef;
    this.embeddedViewRef = null;
    this.context = new NzStringTemplateOutletContext();
    this.nzStringTemplateOutletContext = null;
    this.nzStringTemplateOutlet = null;
  }
  ngOnChanges(changes) {
    const {
      nzStringTemplateOutletContext,
      nzStringTemplateOutlet
    } = changes;
    const shouldRecreateView = () => {
      let shouldOutletRecreate = false;
      if (nzStringTemplateOutlet) {
        if (nzStringTemplateOutlet.firstChange) {
          shouldOutletRecreate = true;
        } else {
          const isPreviousOutletTemplate = nzStringTemplateOutlet.previousValue instanceof TemplateRef;
          const isCurrentOutletTemplate = nzStringTemplateOutlet.currentValue instanceof TemplateRef;
          shouldOutletRecreate = isPreviousOutletTemplate || isCurrentOutletTemplate;
        }
      }
      const hasContextShapeChanged = (ctxChange) => {
        const prevCtxKeys = Object.keys(ctxChange.previousValue || {});
        const currCtxKeys = Object.keys(ctxChange.currentValue || {});
        if (prevCtxKeys.length === currCtxKeys.length) {
          for (const propName of currCtxKeys) {
            if (prevCtxKeys.indexOf(propName) === -1) {
              return true;
            }
          }
          return false;
        } else {
          return true;
        }
      };
      const shouldContextRecreate = nzStringTemplateOutletContext && hasContextShapeChanged(nzStringTemplateOutletContext);
      return shouldContextRecreate || shouldOutletRecreate;
    };
    if (nzStringTemplateOutlet) {
      this.context.$implicit = nzStringTemplateOutlet.currentValue;
    }
    const recreateView = shouldRecreateView();
    if (recreateView) {
      this.recreateView();
    } else {
      this.updateContext();
    }
  }
  static {
    this.ɵfac = function NzStringTemplateOutletDirective_Factory(t) {
      return new (t || _NzStringTemplateOutletDirective)(ɵɵdirectiveInject(ViewContainerRef), ɵɵdirectiveInject(TemplateRef));
    };
  }
  static {
    this.ɵdir = ɵɵdefineDirective({
      type: _NzStringTemplateOutletDirective,
      selectors: [["", "nzStringTemplateOutlet", ""]],
      inputs: {
        nzStringTemplateOutletContext: "nzStringTemplateOutletContext",
        nzStringTemplateOutlet: "nzStringTemplateOutlet"
      },
      exportAs: ["nzStringTemplateOutlet"],
      standalone: true,
      features: [ɵɵNgOnChangesFeature]
    });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(NzStringTemplateOutletDirective, [{
    type: Directive,
    args: [{
      selector: "[nzStringTemplateOutlet]",
      exportAs: "nzStringTemplateOutlet",
      standalone: true
    }]
  }], () => [{
    type: ViewContainerRef
  }, {
    type: TemplateRef
  }], {
    nzStringTemplateOutletContext: [{
      type: Input
    }],
    nzStringTemplateOutlet: [{
      type: Input
    }]
  });
})();
var NzStringTemplateOutletContext = class {
};
var NzOutletModule = class _NzOutletModule {
  static {
    this.ɵfac = function NzOutletModule_Factory(t) {
      return new (t || _NzOutletModule)();
    };
  }
  static {
    this.ɵmod = ɵɵdefineNgModule({
      type: _NzOutletModule,
      imports: [NzStringTemplateOutletDirective],
      exports: [NzStringTemplateOutletDirective]
    });
  }
  static {
    this.ɵinj = ɵɵdefineInjector({});
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(NzOutletModule, [{
    type: NgModule,
    args: [{
      imports: [NzStringTemplateOutletDirective],
      exports: [NzStringTemplateOutletDirective]
    }]
  }], null, null);
})();

// node_modules/@angular/cdk/fesm2022/keycodes.mjs
var SHIFT = 16;
var CONTROL = 17;
var ALT = 18;
var ESCAPE = 27;
var META = 91;
var MAC_META = 224;
function hasModifierKey(event, ...modifiers) {
  if (modifiers.length) {
    return modifiers.some((modifier) => event[modifier]);
  }
  return event.altKey || event.shiftKey || event.ctrlKey || event.metaKey;
}

export {
  NzFormStatusService,
  NzFormNoStatusService,
  NzFormItemFeedbackIconComponent,
  NzFormPatchModule,
  NzStringTemplateOutletDirective,
  NzOutletModule,
  SHIFT,
  CONTROL,
  ALT,
  ESCAPE,
  META,
  MAC_META,
  hasModifierKey
};
//# sourceMappingURL=chunk-5SQ6L5SO.js.map
