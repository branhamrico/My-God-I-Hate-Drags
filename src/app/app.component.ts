import { Component, OnInit, HostListener } from '@angular/core';
import { FdaDrugService } from './fda-drug.service';
import { HttpParams } from '@angular/common/http';
import { interval, Observable, empty, Subscription } from "rxjs";
import { mergeMap, takeUntil, takeWhile, expand, delay, delayWhen } from "rxjs/operators";


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  public loading;
  public scrollLoading;
  public resultObject;
  public dataLen = 0;
  public data = [];
  public dataNotSearch = [];
  public toShow = [];
  public completed = false;
  public search = '';
  public onSearch;
  public filter;
  public filterFields = ['oral',
    'topical',
    'intravenous',
    'dental',
    'respiratory',
    'ophthalmic',
    'intramuscular',
    'subcutaneous',
    'nasal',
    'rectal'];
  public errorMessage = '';
  
  private toExtractGroup = 0;
  private groupCount = 0;
  private limit = 100;
  private skip = 0;
  private params;
  private $ongoingObservable: Subscription;

  constructor(private service: FdaDrugService) { }

  ngOnInit() {
    this.paramDefault();
    this.loadDefault();
  }

  resetVariables() {
    this.loading = false;
    this.scrollLoading = false;
    this.data = [];
    this.dataNotSearch = [];
    this.resultObject = null;
    this.dataLen = 0;
    this.toShow = [];
    this.groupCount = 0;
    this.toExtractGroup = 0;
    this.skip = 0;
    this.completed = false;
  }

  parameters() {
    let params = new HttpParams();
    this.skip = this.dataLen;
    params = params.set('limit', `${this.limit}`);
    params = params.set('skip', `${this.skip}`);
    return params;
  }

  paramDefault(customSearch = []) {
    let params = this.parameters();
    params = params.set('search', 
      ['_exists_:openfda', ...customSearch]
        .filter(f => f)
        .join('+AND+'));
    this.params = { params };
  }

  searchParam() {
    const queries = [];
    let filter = '';

    if (this.search) {
      const s = this.searchQueryValueEscape();
      
      queries.push(`(openfda.generic_name:${s}`);
      queries.push(`openfda.brand_name:${s})`);
    }

    if (this.filter) {
      filter = `openfda.route:${this.filter}`;
    }

    this.paramDefault([queries.join('+'), filter]);
    console.log(this.params);
  }

  searchQueryValueEscape() {
    return this.search.trim().includes(' ') ? `"${this.search.replace(new RegExp(' ', 'g'), '+')}"` : this.search;
  }

  /**
   * Depending on whos the caller of this function,
   * on initialized this is called to fetch a non-search listing
   */
  loadDefault() {
    this.errorMessage = '';
    this.loading = true;
    let turn = 0;
    this.$ongoingObservable = this.service.loadDrugs(null, this.params)
      .pipe(
        expand(() => {
          if (this.dataLen === this.resultObject.meta.results.total) {
            return empty(); // breaks the cycle of recursive http call
          }

          return this.service.loadDrugs(null, this.params)
            .pipe(delay(2000)); // give ample time before fetching new result
        }))
        .subscribe(r => {
          this.loading = false;
          this.extract(r);

          if (turn === 0) {
            this.flatten(this.toExtractGroup);
          }
          
          // if too few records are shown, complete it immediately because scroll is not possible
          if (this.dataLen < 3 && this.dataLen === this.resultObject.meta.results.total) {
            this.completed = true;
          }
          turn++;
        }, e => {
          console.log(e);
          this.errorMessage = e.error.error.message;
          this.loading = false;
        });
  }

  extract(r) {
    this.resultObject = r;
    this.dataLen += r.results.length;
    this.toShow.push([ ...r.results ]);
    this.groupCount++;

    if (this.onSearch) {
      this.searchParam();
      return;
    }
    this.paramDefault();
  }

  onScroll(e) {
    if (this.completed) {
      return;
    }

    if (this.data.length === this.resultObject.meta.results.total) {
      console.log("completed");
      this.completed = true;
      this.scrollLoading = false;
      return;
    }

    if (!this.scrollLoading) {
      this.scrollLoading = true;
      this.flatten(++this.toExtractGroup);
      setTimeout(() => this.scrollLoading = false, 600);
    }
  }

  flatten(i) {
    let n = 0;
    const c = [];
    while (n < this.groupCount) {
      c.push([ ...this.toShow[n] ]);
      if (n === i) {
        break;
      }
      n++;
    }


    this.data = [ ...c ].reduce((acc, val) => acc.concat(val), []);
    this.dataNotSearch = this.data.filter(d => d.openfda.brand_name);
  }

  searchNow(e) {
    this.resetVariables();
    this.searchParam();
    this.onSearch = true;

    this.$ongoingObservable.unsubscribe(); // kill ongoing background fetch from non-search call

    this.loadDefault();
  }

  resetSearchNow(e) {
    this.onSearch = false;
    this.search = '';
    this.filter = '';

    this.$ongoingObservable.unsubscribe(); // kill ongoing background fetch from search call
    this.resetVariables();
    this.paramDefault();
    this.loadDefault();
  }
}
