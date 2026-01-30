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
  selectedCategoryId?: string;

  // Map category names to image files
  categoryImages: { [key: string]: string } = {
    'Musica': '/categories/musica.svg',
    'Just Chatting': '/categories/chatting.svg',
    'League of Legends': '/categories/league.svg',
    'Minecraft': '/categories/minecraft.svg',
    'Valorant': '/categories/valorant.svg',
    'Deportes': '/categories/deportes.svg'
  };

  constructor(private vs: VideoService) {}

  ngOnInit() {
    this.loadHome();
  }

  loadHome() {
    this.vs.getHome().subscribe(data => this.homeData = data);
  }

  selectCategory(cat: Category) {
    this.selectedCategoryId = cat.id;
    this.vs.getStreams(cat.id).subscribe(streams => {
      if (this.homeData) this.homeData.featuredStreams = streams;
    });
  }

  getCategoryImage(categoryName: string): string {
    return this.categoryImages[categoryName] || '/categories/musica.svg';
  }

  isSelected(categoryId: string): boolean {
    return this.selectedCategoryId === categoryId;
  }
}
