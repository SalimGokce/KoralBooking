import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import * as moment from 'moment';


import { BehaviorSubject, config, Subject } from 'rxjs';
import { distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { ApiService } from '../api.service';
import { HotelConfig } from '../types';


@Component({
  selector: 'app-searchbox',
  templateUrl: './searchbox.component.html',
  styleUrls: ['./searchbox.component.css']
})
export class SearchboxComponent implements OnInit, OnDestroy {
  mock60 = Array(60);
  hotelConfig$ = new BehaviorSubject<HotelConfig | null>(null);

  isDestroyed = new Subject();
  
  minDate: Date;
  maxDate: Date;
  minLos = new BehaviorSubject(this.hotelConfig$.getValue()?.MinLOS || 1);
  minDayFilter = new BehaviorSubject(moment().format('YYYY-MM-DD'));
  adultCount = this.hotelConfig$.getValue()?.MaxAdult;
  childCount = this.hotelConfig$.getValue()?.MaxChild; 

  searchFormGroup = new FormGroup(
    {
      ADULT: new FormControl(2),
      CHECKIN: new FormControl(new Date()),
      CHECKOUT: new FormControl(new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + this.minLos.value)),
      DAYS: new FormControl(1),
      CHILDAGES: new FormControl(0),
      COUNTRYCODE: new FormControl(''),
      CURRENCY: new FormControl(''),
      HOTELID: new FormControl(null),
      IPADDRESS: new FormControl(''),
      LANGUAGE: new FormControl(''),
      PORTALID: new FormControl(1),
      PORTALSELLERID: new FormControl(null),
      PROMOCODE: new FormControl(''),
      SESSION: new FormControl(null),
    }
  )

  constructor(public api: ApiService) {
    // Set the minimum to January 1st 20 years in the past and December 31st a year in the future.
    const currentYear = new Date().getFullYear();
    this.minDate = new Date(currentYear - 20, 0, 1);
    this.maxDate = new Date(currentYear + 1, 11, 31);
    this.api.hotelConfig$.pipe(takeUntil(this.isDestroyed)).subscribe(info=>{
      if(info){
        this.hotelConfig$.next(info)
        this.minLos.next(info.MinLOS || 1);
      }
    })
  }
  ngOnDestroy(): void {    
      this.isDestroyed.next();
      this.isDestroyed.complete();   
  }

  ngOnInit(): void {   

    this.api.hotelConfig$.pipe(takeUntil(this.isDestroyed)).subscribe({
      next: (config) => {
        this.searchFormGroup.get('HOTELID')?.setValue(config.HOTELID)
      }
    });

    this.searchFormGroup.get('DAYS')?.valueChanges.pipe(
      distinctUntilChanged()
      ).pipe(
      takeUntil(this.isDestroyed)
      ).subscribe(
      {
        next: (days) => {
          this.searchFormGroup.get('CHECKOUT')?.setValue(
            moment(this.searchFormGroup.get('CHECKIN')?.value).add(days, 'days').toDate()   // inc by days
          );
        }
      }
    );

    this.searchFormGroup.get('CHECKIN')?.valueChanges.pipe(
      distinctUntilChanged()
    ).pipe(
      takeUntil(this.isDestroyed)
      ).subscribe(
      {
        next: () => {

          const cIn = this.searchFormGroup.get('CHECKIN')?.value  
          const cOut = this.searchFormGroup.get('CHECKOUT')?.value
          var cInArr = parseInt(moment(cIn).format('DD')) + parseInt(moment(cIn).format('MM')) * 30 + parseInt(moment(cIn).format('YYYY')) * 365;       
          var cOutArr = parseInt(moment(cOut).format('DD')) + parseInt(moment(cOut).format('MM')) * 30 + parseInt(moment(cOut).format('YYYY')) * 365;            
             
          this.searchFormGroup.get('CHECKOUT')?.setValue(
            moment(this.searchFormGroup.get('CHECKIN')?.value).add(this.minLos.value , "day").toDate()   // inc by days
          );
          if(!cIn|| cOutArr < cInArr ) {
            this.searchFormGroup.get('CHECKOUT')?.setValue(moment(cIn).add(+this.minLos.value, 'day').toISOString());
          } else {
            this.searchFormGroup.get('CHECKOUT')?.setValue(cOut);
          }       
        }
      }
    );

    this.searchFormGroup.get('CHECKOUT')?.valueChanges.pipe(
      distinctUntilChanged(
        (x1, x2) => {
          return moment(x1).startOf('day').isSame(moment(x2).startOf('day'));
        }
      )
    ).pipe(
      takeUntil(this.isDestroyed)
      ).subscribe(
      {
        next: (checkout) => {
          const cin = moment(this.searchFormGroup.get('CHECKIN')?.value);
          const cout = moment(this.searchFormGroup.get('CHECKOUT')?.value);
          this.searchFormGroup.get('DAYS')?.setValue(
            moment.duration(cout.diff(cin)).asDays()   // find diff by days
          );
        }
      }
    )

  }

  onSearch(): void {
    console.log(this.searchFormGroup.value);
    this.api.getRooms(this.searchFormGroup.value).pipe(
      takeUntil(this.isDestroyed)
      ).subscribe((response) => {
      this.api.rooms$.next(response);
    }
    );
  }

  myFilter = (d: Date): boolean => {
    return moment(d).startOf('day').diff(moment(this.minDayFilter.getValue()).startOf('day')) > -1;
    // tslint:disable-next-line:semicolon
  };



}
