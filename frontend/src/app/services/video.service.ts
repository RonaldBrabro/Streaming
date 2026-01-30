import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Video } from '../models/video.model';
import { Comment } from '../models/comment.model';

export interface Category {
  id: string;
  name: string;
  description?: string;
}

export interface Stream {
  id: string;
  title: string;
  thumbnail: string;
  is_live: boolean;
  viewers: number;
  url?: string;
  description?: string;
  id_categoria?: string;
}

export interface HomeData {
  categories: Category[];
  featuredStreams: Stream[];
}

export interface User {
  id_usuario: string;
  nickname: string;
  avatar_url: string;
  region: string;
  role?: string;
}

export interface Channel {
  id_usuario: string;
  id_canal: string;
  name: string;
  bio: string;
  followers: number;
  stream_key: string;
  follows: boolean;
}

@Injectable({ providedIn: 'root' })
export class VideoService {
  private base = '/api'; // assume proxy or same host; adjust in production

  constructor(private http: HttpClient) {}

  getVideos(): Observable<Video[]> {
    return this.http.get<Video[]>(`${this.base}/videos`);
  }

  getHome(): Observable<HomeData> {
    return this.http.get<HomeData>(`${this.base}/home`);
  }

  getCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.base}/categories`);
  }

  getStreams(categoryId: string): Observable<Stream[]> {
    return this.http.get<Stream[]>(`${this.base}/streams?categoryId=${categoryId}`);
  }

  getChannel(id: string): Observable<Channel> {
    return this.http.get<Channel>(`${this.base}/channel/${id}`);
  }

  login(credentials: { email: string; password: string }): Observable<User> {
    return this.http.post<User>(`${this.base}/login`, credentials);
  }

  register(user: { email: string; password: string; region?: string; avatar_url?: string; nickname?: string }): Observable<{ id_usuario: string }> {
    return this.http.post<{ id_usuario: string }>(`${this.base}/register`, user);
  }

  createChannel(channel: { id_usuario: string; nombre_canal: string; biografia?: string; stream_key?: string }): Observable<{ id_canal: string }> {
    return this.http.post<{ id_canal: string }>(`${this.base}/channel`, channel);
  }

  createStream(stream: { titulo: string; id_categoria: string; thumbnail_url?: string; nombre_streamer?: string }): Observable<{ id_stream: string }> {
    return this.http.post<{ id_stream: string }>(`${this.base}/stream`, stream);
  }

  follow(follow: { user_id: string; channel_id: string }): Observable<any> {
    return this.http.post(`${this.base}/follow`, follow);
  }

  getComments(videoId: string): Observable<Comment[]> {
    return this.http.get<Comment[]>(`${this.base}/videos/${videoId}/comments`);
  }

  postComment(comment: { video_id: string; author: string; content: string }) {
    return this.http.post(`${this.base}/comments`, comment);
  }

  // Admin methods
  createCategory(category: { nombre: string; imagen_portada: string }): Observable<any> {
    return this.http.post(`${this.base}/admin/categories`, category);
  }

  deleteStream(stream: Stream): Observable<any> {
    return this.http.delete(`${this.base}/admin/streams`, { body: { id_categoria: stream.id_categoria || '', pico_viewers: stream.viewers, id_stream: stream.id } });
  }

  deleteChannel(id_usuario: string): Observable<any> {
    return this.http.delete(`${this.base}/admin/channel/${id_usuario}`);
  }
}
