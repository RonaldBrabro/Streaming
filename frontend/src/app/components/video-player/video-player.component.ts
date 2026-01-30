import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Stream } from '../../services/video.service';
import { Comment } from '../../models/comment.model';
import { VideoService } from '../../services/video.service';
import { SafeUrlPipe } from '../../pipes/safe-url.pipe';

@Component({
  selector: 'app-video-player',
  standalone: true,
  imports: [CommonModule, FormsModule, SafeUrlPipe],
  templateUrl: './video-player.component.html',
  styleUrls: ['./video-player.component.css']
})
export class VideoPlayerComponent implements OnInit {
  @Input() video!: Stream;
  comments: Comment[] = [];
  newAuthor = '';
  newContent = '';

  constructor(private vs: VideoService) {}

  ngOnInit() {
    if (this.video) {
      (this.video as any).url = 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
      (this.video as any).description = 'Streaming video';
      this.loadComments();
    }
  }

  async loadComments() {
    if (!this.video) return;
    this.vs.getComments(this.video.id).subscribe(c => {
      this.comments = c;
    });
  }

  postComment() {
    if (!this.newAuthor || !this.newContent) return;
    const payload = { video_id: this.video.id, author: this.newAuthor, content: this.newContent };
    this.vs.postComment(payload).subscribe(() => {
      this.newAuthor = '';
      this.newContent = '';
      this.loadComments();
    });
  }
}
