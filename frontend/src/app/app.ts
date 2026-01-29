import { Component, OnInit } from '@angular/core';
import { VideoService } from './services/video.service';
import { Video } from './models/video.model';

@Component({
  selector: 'app-root',
  templateUrl: './app-clean.html',
  standalone: false,
  styleUrl: './app.css'
})
export class App implements OnInit {
  videos: Video[] = [];
  selected?: Video;

  constructor(private vs: VideoService) {}

  ngOnInit() {
    this.vs.getVideos().subscribe(v => this.videos = v);
  }

  select(video: Video) {
    this.selected = video;
  }
}
