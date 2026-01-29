import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Video } from '../../models/video.model';
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
  @Input() video!: Video;
  comments: Comment[] = [];
  newAuthor = '';
  newContent = '';

  constructor(private vs: VideoService) {}

  ngOnInit() {
    if (this.video) this.loadComments();
  }

  async loadComments() {
    if (!this.video) return;
    this.vs.getComments(this.video.video_id).subscribe(c => {
      this.comments = c;
    });
  }

  postComment() {
    if (!this.newAuthor || !this.newContent) return;
    const payload = { video_id: this.video.video_id, author: this.newAuthor, content: this.newContent };
    this.vs.postComment(payload).subscribe(() => {
      this.newAuthor = '';
      this.newContent = '';
      this.loadComments();
    });
  }
}
