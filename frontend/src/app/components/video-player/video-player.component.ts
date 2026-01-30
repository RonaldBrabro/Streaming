import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { VideoService, User } from '../../services/video.service';
import { SafeUrlPipe } from '../../pipes/safe-url.pipe';

@Component({
  selector: 'app-video-player',
  standalone: true,
  imports: [CommonModule, FormsModule, SafeUrlPipe, DatePipe, RouterLink],
  templateUrl: './video-player.component.html',
  styleUrls: ['./video-player.component.css']
})
export class VideoPlayerComponent implements OnInit {
  video: any = null;
  comments: any[] = [];
  otherStreams: any[] = [];
  newContent = '';
  currentUser: User | undefined;
  showLoginPrompt = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private videoService: VideoService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) { }

  ngOnInit(): void {
    // Load current user
    this.loadCurrentUser();

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      // Load video
      this.videoService.getVideos().subscribe(videos => {
        this.video = videos.find((v: any) => v.video_id === id || v.id === id);
      });

      // Load comments
      this.loadComments(id);

      // Load other streams
      this.loadOtherStreams(id);
    }
  }

  loadCurrentUser(): void {
    if (isPlatformBrowser(this.platformId)) {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        this.currentUser = JSON.parse(userStr);
      }
    }
  }

  loadComments(videoId: string): void {
    // Load comments from backend
    this.videoService.getComments(videoId).subscribe(
      (data: any) => {
        this.comments = data || [];
      },
      (error) => {
        console.log('No comments yet or error loading comments');
        this.comments = [];
      }
    );
  }

  loadOtherStreams(currentVideoId: string): void {
    // Load other streams/videos
    this.videoService.getVideos().subscribe(
      (videos: any[]) => {
        this.otherStreams = videos.filter((v: any) => 
          (v.video_id !== currentVideoId && v.id !== currentVideoId)
        ).slice(0, 5); // Show only 5 other streams
      }
    );
  }

  postComment(): void {
    // Check if user is logged in
    if (!this.currentUser) {
      this.showLoginPrompt = true;
      return;
    }

    if (!this.newContent.trim()) {
      alert('El comentario no puede estar vacío');
      return;
    }

    const comment = {
      video_id: this.video?.video_id || this.video?.id,
      user_id: this.currentUser.id_usuario,
      author: this.currentUser.nickname,
      content: this.newContent,
      posted_timestamp: new Date()
    };

    this.videoService.postComment(comment).subscribe(
      (res: any) => {
        // Add comment to list
        this.comments.unshift({
          ...comment,
          posted_timestamp: new Date()
        });
        this.newContent = '';
        this.showLoginPrompt = false;
      },
      (error) => {
        console.error('Error posting comment:', error);
        alert('Error al enviar el comentario');
      }
    );
  }

  closeLoginPrompt(): void {
    this.showLoginPrompt = false;
  }
}
