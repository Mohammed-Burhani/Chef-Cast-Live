/**
 * ============================================================================
 * COMMUNITY STORE FOR PROTOTYPE
 * ============================================================================
 * Mock implementation for community features: posts, comments, follows, stories
 * Supabase integration will be added later
 */

import { create } from 'zustand';
import { CommunityPost, Comment, Story, Follow } from '@/types';

interface CommunityState {
  // Posts
  posts: CommunityPost[];
  isLoadingPosts: boolean;
  
  // Comments
  comments: Comment[];
  isLoadingComments: boolean;
  
  // Stories
  stories: Story[];
  isLoadingStories: boolean;
  
  // Follows
  following: string[];
  followers: string[];
  
  // Actions
  loadPosts: (filter?: 'all' | 'following') => Promise<void>;
  createPost: (post: Omit<CommunityPost, 'id' | 'likes' | 'isLiked' | 'comments' | 'shares' | 'createdAt'>) => Promise<void>;
  toggleLike: (postId: string) => Promise<void>;
  toggleSave: (postId: string) => Promise<void>;
  
  loadComments: (postId: string) => Promise<void>;
  addComment: (postId: string, text: string) => Promise<void>;
  toggleLikeComment: (commentId: string) => Promise<void>;
  
  loadStories: () => Promise<void>;
  createStory: (story: Omit<Story, 'id' | 'viewers' | 'isViewed' | 'createdAt'>) => Promise<void>;
  viewStory: (storyId: string) => Promise<void>;
  
  toggleFollow: (userId: string) => Promise<void>;
  loadUserRelations: (userId: string) => Promise<void>;
  
  reset: () => void;
}

// Mock data for prototype
const MOCK_POSTS: CommunityPost[] = [
  {
    id: 'post-1',
    userId: 'user-1',
    username: 'chef_marco',
    avatarUrl: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=100&h=100&fit=crop',
    episodeTitle: 'Italian Risotto Night',
    photoUrl: 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=800',
    caption: 'Perfect risotto takes patience, but the result is worth it! 🍚✨ #Risotto #ItalianCuisine #ChefLife',
    likes: 1243,
    isLiked: true,
    comments: 89,
    shares: 45,
    isSaved: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    location: 'Milan, Italy',
    tags: ['Risotto', 'ItalianCuisine', 'ChefLife'],
  },
  {
    id: 'post-2',
    userId: 'user-2',
    username: 'foodie_sara',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
    episodeTitle: 'Pan-Seared Duck Breast',
    photoUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800',
    caption: 'Finally mastered the perfect duck skin! Thanks Chef Sophie for the amazing tips! 🦆✨',
    likes: 892,
    isLiked: false,
    comments: 56,
    shares: 23,
    isSaved: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    location: 'Paris, France',
    tags: ['Duck', 'FrenchCuisine', 'HomeCooking'],
  },
  {
    id: 'post-3',
    userId: 'user-3',
    username: 'home_cook_john',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
    episodeTitle: 'Thai Green Curry',
    photoUrl: 'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=800',
    caption: 'Made my first green curry from scratch! The homemade paste makes all the difference 🌶️🥥',
    likes: 654,
    isLiked: false,
    comments: 34,
    shares: 18,
    isSaved: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
    location: 'London, UK',
    tags: ['ThaiCurry', 'Spicy', 'Homemade'],
  },
  {
    id: 'post-4',
    userId: 'user-4',
    username: 'baking_queen',
    avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop',
    episodeTitle: 'French Onion Soup',
    photoUrl: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800',
    caption: 'Low and slow, then fast and furious. This soup took 6 hours but it was SO worth it! 🧅🍲',
    likes: 1102,
    isLiked: true,
    comments: 78,
    shares: 56,
    isSaved: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
    location: 'New York, USA',
    tags: ['FrenchOnionSoup', 'ComfortFood', 'SlowCooking'],
  },
  {
    id: 'post-5',
    userId: 'user-5',
    username: 'healthy_eater',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
    episodeTitle: 'Spanish Paella Masterclass',
    photoUrl: 'https://images.unsplash.com/photo-1534080564583-6be75777b70a?w=800',
    caption: 'Weekend project: authentic Spanish paella! The socarrat came out perfectly 🥘🇪🇸',
    likes: 934,
    isLiked: false,
    comments: 67,
    shares: 31,
    isSaved: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 480).toISOString(),
    location: 'Barcelona, Spain',
    tags: ['Paella', 'SpanishFood', 'WeekendCooking'],
  },
];

const MOCK_COMMENTS: Comment[] = [
  {
    id: 'comment-1',
    postId: 'post-1',
    userId: 'user-2',
    username: 'foodie_sara',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
    text: 'This looks absolutely amazing! I need to try this recipe 😍',
    likes: 24,
    isLiked: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  },
  {
    id: 'comment-2',
    postId: 'post-1',
    userId: 'user-3',
    username: 'home_cook_john',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
    text: 'The secret is definitely in the mantecatura technique!',
    likes: 18,
    isLiked: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
  },
  {
    id: 'comment-3',
    postId: 'post-2',
    userId: 'user-1',
    username: 'chef_marco',
    avatarUrl: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=100&h=100&fit=crop',
    text: 'Beautiful rendering on that duck! Great work 🙌',
    likes: 45,
    isLiked: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
  },
];

const MOCK_STORIES: Story[] = [
  {
    id: 'story-1',
    userId: 'user-1',
    username: 'chef_marco',
    avatarUrl: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=100&h=100&fit=crop',
    mediaUrl: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800',
    mediaType: 'image',
    caption: 'Behind the scenes at the restaurant today! 🎬',
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 23).toISOString(),
    viewers: ['user-2', 'user-3'],
    isViewed: false,
  },
  {
    id: 'story-2',
    userId: 'user-2',
    username: 'foodie_sara',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
    mediaUrl: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800',
    mediaType: 'image',
    caption: 'Cooking up something special! Stay tuned 👀',
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 23.5).toISOString(),
    viewers: [],
    isViewed: false,
  },
  {
    id: 'story-3',
    userId: 'user-4',
    username: 'baking_queen',
    avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop',
    mediaUrl: 'https://images.unsplash.com/photo-1509365465985-25d11c17e812?w=800',
    mediaType: 'image',
    caption: 'Fresh bread day! 🍞✨',
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 22).toISOString(),
    viewers: ['user-1', 'user-2', 'user-3'],
    isViewed: true,
  },
];

export const useCommunityStore = create<CommunityState>()((set, get) => ({
  // Initial state
  posts: MOCK_POSTS,
  isLoadingPosts: false,
  comments: MOCK_COMMENTS,
  isLoadingComments: false,
  stories: MOCK_STORIES,
  isLoadingStories: false,
  following: ['user-1', 'user-2', 'user-4'],
  followers: ['user-2', 'user-3', 'user-5'],

  // Posts
  loadPosts: async (filter = 'all') => {
    set({ isLoadingPosts: true });
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      let filteredPosts = MOCK_POSTS;
      if (filter === 'following') {
        const following = get().following;
        filteredPosts = MOCK_POSTS.filter(post => following.includes(post.userId));
      }
      
      set({ posts: filteredPosts, isLoadingPosts: false });
    } catch (error) {
      console.error('[Community] Load posts error:', error);
      set({ isLoadingPosts: false });
    }
  },

  createPost: async (postData) => {
    try {
      const newPost: CommunityPost = {
        ...postData,
        id: `post-${Date.now()}`,
        likes: 0,
        isLiked: false,
        comments: 0,
        shares: 0,
        createdAt: new Date().toISOString(),
      };
      
      set(state => ({ posts: [newPost, ...state.posts] }));
    } catch (error) {
      console.error('[Community] Create post error:', error);
    }
  },

  toggleLike: async (postId: string) => {
    try {
      set(state => ({
        posts: state.posts.map(post => {
          if (post.id === postId) {
            return {
              ...post,
              isLiked: !post.isLiked,
              likes: post.isLiked ? post.likes - 1 : post.likes + 1,
            };
          }
          return post;
        }),
      }));
    } catch (error) {
      console.error('[Community] Toggle like error:', error);
    }
  },

  toggleSave: async (postId: string) => {
    try {
      set(state => ({
        posts: state.posts.map(post => {
          if (post.id === postId) {
            return { ...post, isSaved: !post.isSaved };
          }
          return post;
        }),
      }));
    } catch (error) {
      console.error('[Community] Toggle save error:', error);
    }
  },

  // Comments
  loadComments: async (postId: string) => {
    set({ isLoadingComments: true });
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const postComments = MOCK_COMMENTS.filter(comment => comment.postId === postId);
      set({ comments: postComments, isLoadingComments: false });
    } catch (error) {
      console.error('[Community] Load comments error:', error);
      set({ isLoadingComments: false });
    }
  },

  addComment: async (postId: string, text: string) => {
    try {
      const newComment: Comment = {
        id: `comment-${Date.now()}`,
        postId,
        userId: 'me', // Current user
        username: 'you',
        avatarUrl: undefined,
        text,
        likes: 0,
        isLiked: false,
        createdAt: new Date().toISOString(),
      };
      
      set(state => ({
        comments: [newComment, ...state.comments],
        posts: state.posts.map(post => {
          if (post.id === postId) {
            return { ...post, comments: post.comments + 1 };
          }
          return post;
        }),
      }));
    } catch (error) {
      console.error('[Community] Add comment error:', error);
    }
  },

  toggleLikeComment: async (commentId: string) => {
    try {
      set(state => ({
        comments: state.comments.map(comment => {
          if (comment.id === commentId) {
            return {
              ...comment,
              isLiked: !comment.isLiked,
              likes: comment.isLiked ? comment.likes - 1 : comment.likes + 1,
            };
          }
          return comment;
        }),
      }));
    } catch (error) {
      console.error('[Community] Toggle like comment error:', error);
    }
  },

  // Stories
  loadStories: async () => {
    set({ isLoadingStories: true });
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 400));
      
      // Filter out expired stories
      const now = new Date();
      const validStories = MOCK_STORIES.filter(story => new Date(story.expiresAt) > now);
      
      set({ stories: validStories, isLoadingStories: false });
    } catch (error) {
      console.error('[Community] Load stories error:', error);
      set({ isLoadingStories: false });
    }
  },

  createStory: async (storyData) => {
    try {
      const newStory: Story = {
        ...storyData,
        id: `story-${Date.now()}`,
        viewers: [],
        isViewed: false,
        createdAt: new Date().toISOString(),
      };
      
      set(state => ({ stories: [newStory, ...state.stories] }));
    } catch (error) {
      console.error('[Community] Create story error:', error);
    }
  },

  viewStory: async (storyId: string) => {
    try {
      set(state => ({
        stories: state.stories.map(story => {
          if (story.id === storyId) {
            return {
              ...story,
              isViewed: true,
              viewers: [...(story.viewers || []), 'me'],
            };
          }
          return story;
        }),
      }));
    } catch (error) {
      console.error('[Community] View story error:', error);
    }
  },

  // Follows
  toggleFollow: async (userId: string) => {
    try {
      set(state => {
        const isFollowing = state.following.includes(userId);
        return {
          following: isFollowing
            ? state.following.filter(id => id !== userId)
            : [...state.following, userId],
        };
      });
    } catch (error) {
      console.error('[Community] Toggle follow error:', error);
    }
  },

  loadUserRelations: async (userId: string) => {
    try {
      // In a real app, this would fetch from the database
      // For prototype, we'll use mock data
      set({
        following: ['user-1', 'user-2', 'user-4'],
        followers: ['user-2', 'user-3', 'user-5'],
      });
    } catch (error) {
      console.error('[Community] Load user relations error:', error);
    }
  },

  reset: () => {
    set({
      posts: MOCK_POSTS,
      comments: MOCK_COMMENTS,
      stories: MOCK_STORIES,
      following: ['user-1', 'user-2', 'user-4'],
      followers: ['user-2', 'user-3', 'user-5'],
      isLoadingPosts: false,
      isLoadingComments: false,
      isLoadingStories: false,
    });
  },
}));