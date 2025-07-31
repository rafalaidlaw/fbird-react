# Kilboy Game - Architecture Documentation

## Overview

Kilboy is a 2D side-scrolling action game built with Phaser.js and TypeScript. The game features a character named Kilboy who can swing through obstacles, perform ledge grabs, and navigate through procedurally generated pipe systems.

## Game Architecture

### Core Framework

- **Engine**: Phaser.js 3.x
- **Language**: TypeScript
- **Physics**: Arcade Physics System
- **Build System**: Webpack with TypeScript compilation

### Scene Management System

#### Scene Hierarchy

```
Game Entry Point (index.ts)
├── PreloadScene (Asset Loading)
├── MenuScene (Main Menu)
├── PlayScene (Main Game)
├── ScoreScene (Score Display)
└── PauseScene (Pause Menu)
```

#### Base Scene Architecture

- **BaseScene**: Abstract base class providing common functionality
  - Shared configuration management
  - Menu creation utilities
  - Background rendering
  - Navigation controls

### Core Game Systems

#### 1. Player System (`Player.ts`)

**Purpose**: Manages the main character (Kilboy) and all player-related mechanics

**Key Components**:

- **Sprite Management**: Physics-based sprite with custom origin (0, 1) for bottom-left positioning
- **Hitbox System**: Multiple specialized hitboxes for different interactions
  - Main physics body (32x24px, fixed size)
  - Attack hitbox (green, for destroying obstacles)
  - Hitstop hitbox (red, for collision detection)
  - Look-ahead hitbox (yellow, for ledge grab detection)
  - Upper hitbox (blue, for sensor detection)

**Animation System**:

- **Swing Animation**: 3-frame sequence (`kilboy_swing_anim1`, `kilboy_swing_anim2`, `kilboy_swing_anim3`)
- **Texture States**: `kilboy`, `kilboy_run`, `kilboy_hurt`, `kilboy_swing_ledgeGrab`
- **Frame Holding**: Advanced system for holding swing frames during combat

**Physics Properties**:

- **Gravity**: 400px/s² (configurable)
- **Body Size**: Fixed 32x24px (prevents texture changes from affecting hitbox)
- **Origin**: (0, 1) - bottom-left corner for consistent positioning

#### 2. Pipe Management System

**Hierarchy**:

```
PipeManager (Base)
├── UpperPipeManager (Upper pipes with purple cubes)
├── LowerPipeManager (Lower pipes with maroon cubes)
└── FloatingPipeManager (Floating pipes with green platforms)
```

**Pipe Types**:

- **Upper Pipes**: Contain purple cubes that can be destroyed
- **Lower Pipes**: Contain maroon cubes that cause damage
- **Floating Pipes**: Provide green platforms for landing

**Hitbox System**:

- **Green Hitboxes**: Landing platforms (disable gravity, set Y position)
- **Blue Hitboxes**: Sensor detection (trigger special events)
- **Purple Hitboxes**: Destructible obstacles (swing to destroy)
- **Maroon Hitboxes**: Dangerous obstacles (cause damage)
- **Brown Hitboxes**: Ledge grab targets

#### 3. Chunk Management System (`ChunkManager.ts`)

**Purpose**: Procedural level generation and management

**Features**:

- **Template-Based Generation**: Uses predefined chunk templates
- **Dynamic Spawning**: Spawns chunks ahead of player position
- **Recycling System**: Removes old chunks to optimize performance
- **Difficulty Scaling**: Adjusts chunk complexity based on progress

**Chunk Template Structure**:

```typescript
interface ChunkTemplate {
  id: string;
  width: number;
  pipes: PipeConfig[];
  enemies: EnemyConfig[];
  difficulty: number;
}
```

#### 4. Collision Detection System

**Multi-Layer Hitbox System**:

1. **Main Physics Body**: Handles ground collision and basic physics
2. **Auxiliary Hitboxes**: Specialized collision detection
3. **Sensor Hitboxes**: Event triggers without physical collision

**Collision Types**:

- **Ground Collision**: Disables gravity, sets running texture
- **Green Platform Collision**: Disables gravity, positions player
- **Purple Cube Collision**: Triggers destruction and hitstop
- **Maroon Cube Collision**: Causes damage and invincibility
- **Ledge Grab Detection**: Triggers ledge grab animation

#### 5. Hitstop System (`HitStop.ts`, `PipeCutHitStop.ts`)

**Purpose**: Provides visual feedback and time manipulation

**Features**:

- **Global Hitstop**: Freezes game state for dramatic effect
- **Pipe Cut Hitstop**: Specialized feedback for pipe destruction
- **Cooldown Management**: Prevents excessive hitstop triggers
- **Visual Effects**: Screen shake and time manipulation

#### 6. Ledge Grab System (`LedgeGrabManager.ts`)

**Purpose**: Handles automatic ledge grabbing mechanics

**Features**:

- **Detection**: Uses look-ahead hitbox to detect grab opportunities
- **Animation**: Smooth transition from falling to ledge grab pose
- **Positioning**: Automatically positions player at optimal grab location
- **State Management**: Prevents multiple simultaneous grabs

#### 7. UI Management System (`UIManager.ts`)

**Purpose**: Manages all user interface elements

**Components**:

- **Health Display**: Visual health indicator
- **Score Display**: Current score and best score
- **Pause Menu**: Game pause functionality
- **Debug Information**: Development tools and information

### Physics and Positioning System

#### Origin System

- **Player Origin**: (0, 1) - bottom-left corner
- **Consistent Positioning**: Fixed sprite height (48px) for calculations
- **Hitbox Alignment**: All hitboxes positioned relative to bottom-left origin

#### Gravity System

- **Base Gravity**: 400px/s²
- **Gravity Multiplier**: Enhanced gravity during falling (1.5x)
- **Gravity Disabling**: Platforms and ground disable gravity
- **Gravity Restoration**: Automatic restoration when leaving platforms

#### Velocity Management

- **X Velocity**: Constant forward movement (PLAYER_X_VELOCITY)
- **Y Velocity**: Dynamic based on physics and input
- **Deceleration**: Applied to upward movement for realistic feel

### Animation and Visual System

#### Texture Management

- **Fixed Body Size**: Prevents texture changes from affecting hitbox
- **Consistent Body Size**: `ensureConsistentBodySize()` called after every texture change
- **Animation States**: Smooth transitions between different character states

#### Visual Effects

- **Invincibility Flash**: Alpha animation during damage
- **Hitstop Effects**: Screen manipulation for impact feedback
- **Fade Effects**: Cube destruction animations

### Difficulty and Progression System

#### Difficulty Levels

- **Easy**: Wider pipe spacing, fewer obstacles
- **Normal**: Balanced challenge
- **Hard**: Tighter spacing, more complex obstacles

#### Dynamic Scaling

- **Score-Based**: Difficulty increases with score
- **Chunk-Based**: More complex chunks at higher levels
- **Enemy Scaling**: More aggressive enemies in later sections

### Performance Optimization

#### Object Pooling

- **Pipe Recycling**: Reuses pipe objects to reduce memory usage
- **Chunk Recycling**: Removes old chunks to maintain performance
- **Hitbox Reuse**: Efficient hitbox creation and destruction

#### Memory Management

- **Texture Consistency**: Fixed body sizes prevent memory fragmentation
- **Event Cleanup**: Proper removal of event listeners
- **Timer Management**: Cleanup of timer events to prevent leaks

### Input and Control System

#### Input Handling

- **Space Bar**: Primary jump/swing action
- **Mouse/Touch**: Menu navigation and pause
- **Keyboard**: Debug controls and development tools

#### State Management

- **Player States**: Idle, running, jumping, swinging, invincible
- **Game States**: Playing, paused, game over, menu
- **Animation States**: Various texture and animation states

### Debug and Development Tools

#### Debug Features

- **Hitbox Visualization**: Colored rectangles for all hitboxes
- **Position Tracking**: Real-time position and velocity display
- **Chunk Information**: Current chunk and template data
- **Performance Metrics**: Frame rate and memory usage

#### Development Utilities

- **Console Logging**: Comprehensive debug logging
- **Error Handling**: Graceful error recovery
- **State Inspection**: Real-time state monitoring

## Technical Specifications

### Game Configuration

- **Resolution**: 400x500 pixels
- **Physics**: Arcade physics with debug enabled
- **Canvas**: Optimized for frequent reads
- **Font**: Custom BKShatteredScore font

### Performance Targets

- **Frame Rate**: 60 FPS
- **Memory Usage**: Optimized object pooling
- **Load Times**: Efficient asset loading and caching

### Browser Compatibility

- **Modern Browsers**: Chrome, Firefox, Safari, Edge
- **Mobile Support**: Touch controls and responsive design
- **WebGL**: Hardware-accelerated rendering

## File Structure

```
src/
├── index.ts                 # Game entry point and configuration
├── interface.ts             # Shared TypeScript interfaces
├── HitStop.ts              # Global hitstop system
├── PipeCutHitStop.ts       # Specialized pipe cut feedback
├── scenes/
│   ├── BaseScene.ts        # Abstract base scene
│   ├── PreloadScene.ts     # Asset loading
│   ├── MenuScene.ts        # Main menu
│   ├── PlayScene.ts        # Main game logic
│   ├── ScoreScene.ts       # Score display
│   ├── PauseScene.ts       # Pause menu
│   ├── Player.ts           # Player character system
│   ├── PipeManager.ts      # Base pipe management
│   ├── UpperPipeManager.ts # Upper pipe system
│   ├── LowerPipeManager.ts # Lower pipe system
│   ├── FloatingPipeManager.ts # Floating pipe system
│   ├── ChunkManager.ts     # Level generation
│   ├── LedgeGrabManager.ts # Ledge grab mechanics
│   ├── UIManager.ts        # User interface
│   └── EnemyWalking.ts     # Enemy AI system
└── templates/
    └── currentPipesTemplate.ts # Level chunk templates
```

## Development Guidelines

### Code Organization

- **Modular Design**: Each system is self-contained
- **Type Safety**: Comprehensive TypeScript interfaces
- **Event-Driven**: Clean separation of concerns
- **Performance-First**: Optimized for 60 FPS

### Best Practices

- **Consistent Naming**: Clear, descriptive variable and function names
- **Error Handling**: Graceful degradation and error recovery
- **Memory Management**: Proper cleanup of resources
- **Documentation**: Comprehensive code comments

### Testing Strategy

- **Manual Testing**: Regular gameplay testing
- **Performance Monitoring**: Frame rate and memory usage tracking
- **Cross-Browser Testing**: Compatibility verification
- **Mobile Testing**: Touch control validation

This architecture provides a solid foundation for a complex 2D action game with smooth performance, maintainable code, and extensible systems.
