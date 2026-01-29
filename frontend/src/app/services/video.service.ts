import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Video } from '../models/video.model';
import { Comment } from '../models/comment.model';

@Injectable({ providedIn: 'root' })
export class VideoService {
  private base = '/api'; // assume proxy or same host; adjust in production

  constructor(private http: HttpClient) {}

  getVideos(): Observable<Video[]> {
    return this.http.get<Video[]>(`${this.base}/videos`);
  }

  getComments(videoId: string): Observable<Comment[]> {
    return this.http.get<Comment[]>(`${this.base}/videos/${videoId}/comments`);
  }

  postComment(comment: { video_id: string; author: string; content: string }) {
    return this.http.post(`${this.base}/comments`, comment);
  }
}
