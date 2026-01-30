import { Component, OnInit } from '@angular/core';
import { VideoService, Stream, Category } from '../services/video.service';

@Component({
  selector: 'app-admin-panel',
  standalone: false,
  templateUrl: './admin-panel.html',
  styleUrl: './admin-panel.css',
})
export class AdminPanel implements OnInit {
  streams: Stream[] = [];
  categoryForm = { nombre: '', imagen_portada: '' };
  channelId = '';

  constructor(private vs: VideoService) {}

  ngOnInit() {
    this.loadStreams();
  }

  loadStreams() {
    this.vs.getHome().subscribe(data => {
      this.streams = data.featuredStreams;
    });
  }

  createCategory() {
    this.vs.createCategory(this.categoryForm).subscribe(() => {
      alert('Categoría creada');
      this.categoryForm = { nombre: '', imagen_portada: '' };
    });
  }

  deleteStream(stream: Stream) {
    if (confirm('¿Eliminar este stream?')) {
      this.vs.deleteStream(stream).subscribe(() => {
        this.loadStreams();
      });
    }
  }

  deleteChannel() {
    if (confirm('¿Eliminar este canal?')) {
      this.vs.deleteChannel(this.channelId).subscribe(() => {
        alert('Canal eliminado');
        this.channelId = '';
      });
    }
  }
}
