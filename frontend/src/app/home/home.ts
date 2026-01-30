import { Component, OnInit } from '@angular/core';
import { VideoService, HomeData, Category, Stream } from '../services/video.service';

@Component({
  selector: 'app-home',
  standalone: false,
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit {
  homeData?: HomeData;

  constructor(private vs: VideoService) {}

  ngOnInit() {
    this.loadHome();
  }

  loadHome() {
    this.vs.getHome().subscribe(data => this.homeData = data);
  }

  selectCategory(cat: Category) {
    this.vs.getStreams(cat.id).subscribe(streams => {
      if (this.homeData) this.homeData.featuredStreams = streams;
    });
  }
}
