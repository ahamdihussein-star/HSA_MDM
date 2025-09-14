
import { Component, ViewChild, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';

import {
  ApexChart,
  ApexAxisChartSeries,
  ChartComponent,
  ApexDataLabels,
  ApexPlotOptions,
  ApexYAxis,
  ApexLegend,
  ApexGrid
} from "ng-apexcharts";

type ApexXAxis = {
  type?: "category" | "datetime" | "numeric";
  categories?: any;
  labels?: {
    rotate?: number;
    style?: {
      colors?: string | string[];
      fontSize?: string;

    };
  };
};

export type ChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  dataLabels: ApexDataLabels;
  plotOptions: ApexPlotOptions;
  yaxis: ApexYAxis;
  xaxis: ApexXAxis;
  grid: ApexGrid;
  colors: string[];
  legend: ApexLegend;
};

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  encapsulation: ViewEncapsulation.None,

})
export class HomeComponent {
  @ViewChild("chart") chart!: ChartComponent;
  // public chartOptions: Partial<ChartOptions>;

  public chartOptions: ChartOptions;
  lang: any;
  constructor(public router: Router) {
    this.lang = localStorage.getItem("lang")
    console.log(this.lang,"LOLOLOLOLOLOLOLOL")
    this.chartOptions = {
      series: [
        {
          name: "distibuted",
          data: [500, 900, 400, 350, 700, 500]
        }
      ],
      chart: {
        height: 540,
        type: "bar",
        events: {
          click: function (chart, w, e) {
            // console.log(chart, w, e)
          }
        }
      },
      colors: [
        "#FFBB38",
        "#16DBCC",
        "#FF82AC",
        "#6D6875",
        "#396AFF",
        "#6B5CA5",
      ],
      plotOptions: {

        bar: {
          columnWidth: "45%",
          distributed: true,
          borderRadius: 10
        }
      },
      dataLabels: {
        enabled: false
      },
      legend: {
        show: false
      },
      grid: {
        show: true,
        xaxis: {
          lines: {
            show: false // show vertical lines
          }
        },
        yaxis: {
          lines: {
            show: true // optional: keep horizontal lines if needed
          }
        },
        strokeDashArray: 0,
        borderColor: '#F3F3F5' // gray color for lines
      },
      xaxis: {
        categories: [
          this.lang == "en" ? "Quarantined" : "المحجوزة",
          this.lang == "en" ? "Golden" : "الذهبية",
          this.lang == "en" ? "Rejected" : "المرفوضة",
          this.lang == "en" ? "Duplicated" : "المكررة",
          this.lang == "en" ? ["Synced SAP", "Historical"] : ["مزامنة مع سجل ", "SAP"],
          this.lang == "en" ? "Pending" : "المعلقة",

        ],
        labels: {
          rotate: -0,
          style: {
            colors: [
              "#99959E",
              "#99959E",
              "#99959E",
              "#99959E",
              "#99959E",
              "#99959E",
            ],
            fontSize: "12px"
          }
        }
      },
      yaxis: {
        opposite: this.lang == "ar",
        min: 0,
        max: 1000, // or another max, depending on your data
        tickAmount: 10, // 0 to 600, so step is 100
        labels: {
          style: {
            colors: "#99959E",
            fontSize: "12px"
          },
          formatter: function (val: number) {
            return `${val}`;
          }
        }
      }

    };
  }
  ngOnInit(): void {

  }





  /** ====== AUTO-ADDED NAV HELPERS ====== */
  private getRowId(row: any): string {
    return ((row?.requestId ?? row?.id ?? row?.key ?? row?.RequestId ?? '') + '');
  }

  /** Open details page; editable=true opens edit mode, false opens view */
  viewOrEditRequest(row: any, editable: boolean): void {
    const id = this.getRowId(row);
    if (!id) return;
    this.router?.navigate(['/new-request', id], {
      queryParams: { mode: editable ? 'edit' : 'view' },
    });
  }



  /** ====== AUTO-ADDED SAFE STUBS (no-op / defaults) ====== */
  taskList: any[] = [];
  checked: boolean = false;
  indeterminate: boolean = false;
  setOfCheckedId: Set<string> = new Set<string>();
  isApprovedVisible: boolean = false;
  isRejectedConfirmVisible: boolean = false;
  isRejectedVisible: boolean = false;
  isAssignVisible: boolean = false;
  inputValue: string = '';
  selectedDepartment: string | null = null;

  onlyPending(): boolean { return false; }
  onlyQuarantined(): boolean { return false; }
  mixedStatuses(): boolean { return false; }

  deleteRows(): void {}
  deleteSingle(_row?: any): void {}
  showApproveModal(): void { this.isApprovedVisible = true; }
  showRejectedModal(): void { this.isRejectedVisible = true; }
  showAssignModal(): void { this.isAssignVisible = true; }
  submitApprove(): void { this.isApprovedVisible = false; }
  rejectApprove(): void { this.isRejectedConfirmVisible = false; }
  confirmReject(): void { this.isRejectedVisible = false; }

  onAllChecked(_ev?: any): void {}
  onItemChecked(id: string, checkedOrEvent: any, status?: string): void {

          const checked = typeof checkedOrEvent === 'boolean' ? checkedOrEvent : !!(checkedOrEvent?.target?.checked ?? checkedOrEvent);
          try {
            if (typeof (this as any).updateCheckedSet === 'function') {
              (this as any).updateCheckedSet(id, checked, status);
            } else if (typeof (this as any).onItemCheckedCore === 'function') {
              (this as any).onItemCheckedCore(id, checked, status);
            }
          } catch {}
        
  }

}
