import * as THREE from 'three';
import { Service } from './types';

/**
 * Physics utilities for 3D Gravity Well visualization
 * Implements force-directed graph with gravitational attraction
 */

export interface ServiceNode {
  id: string;
  service: Service;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  force: THREE.Vector3;
  mass: number; // Based on popularity (totalJobs)
  color: THREE.Color;
}

/**
 * Initialize service nodes in a gravity well shape (funnel/vortex)
 */
export function initializeNodes(services: Service[], radius: number = 15): ServiceNode[] {
  return services.map((service, index) => {
    // Arrange services in a smooth spiral funnel shape
    const totalServices = services.length;
    const normalizedIndex = index / totalServices;

    // Depth in the well (0 = top, 1 = bottom)
    const depth = normalizedIndex;

    // Radius decreases as we go deeper (funnel shape)
    const ringRadius = radius * (1 - depth * 0.7); // Top is wide, bottom is narrow

    // Height (Y) decreases as we go deeper
    const y = 10 - depth * 20; // Top at +10, bottom at -10

    // Angle around the well (creates smooth continuous spiral)
    // More spiral turns = smoother distribution, no visible rings
    const spiralTurns = 15; // Increased from 4 to create continuous spiral
    const theta = normalizedIndex * Math.PI * 2 * spiralTurns;

    // X and Z form the circular orbit at this depth
    const x = ringRadius * Math.cos(theta);
    const z = ringRadius * Math.sin(theta);

    // Mass based on popularity
    const mass = Math.log(service.reputation.totalJobs + 1) * 0.5 + 1;

    // Color based on rating
    const color = getRatingColor(service.reputation.rating);

    return {
      id: service.id,
      service,
      position: new THREE.Vector3(x, y, z),
      velocity: new THREE.Vector3(0, 0, 0),
      force: new THREE.Vector3(0, 0, 0),
      mass,
      color
    };
  });
}

/**
 * Get color based on rating (gradient from red to yellow to green)
 */
export function getRatingColor(rating: number): THREE.Color {
  // Normalize rating to 0-1 range
  const normalized = (rating - 1) / 4; // 1-5 → 0-1

  if (normalized < 0.5) {
    // Red to Yellow (1-3 stars)
    return new THREE.Color().setHSL(0.05 * (normalized * 2), 1, 0.5); // Hue 0-0.1 (red-yellow)
  } else {
    // Yellow to Green (3-5 stars)
    return new THREE.Color().setHSL(0.1 + 0.2 * ((normalized - 0.5) * 2), 1, 0.5); // Hue 0.1-0.3 (yellow-green)
  }
}

/**
 * Calculate gravitational force between two nodes based on shared capabilities
 */
export function calculateGravitationalForce(
  nodeA: ServiceNode,
  nodeB: ServiceNode,
  strengthFactor: number = 0.5
): THREE.Vector3 {
  const sharedCapabilities = nodeA.service.capabilities.filter(cap =>
    nodeB.service.capabilities.includes(cap)
  ).length;

  // No attraction if no shared capabilities
  if (sharedCapabilities === 0) return new THREE.Vector3(0, 0, 0);

  // Direction from A to B
  const direction = new THREE.Vector3().subVectors(nodeB.position, nodeA.position);
  const distance = direction.length();

  // Avoid division by zero
  if (distance < 0.1) return new THREE.Vector3(0, 0, 0);

  // Gravitational force: F = (G * m1 * m2 * sharedCaps) / distance^2
  const forceMagnitude = (strengthFactor * nodeA.mass * nodeB.mass * sharedCapabilities) / (distance * distance);

  // Normalize direction and apply magnitude
  direction.normalize().multiplyScalar(forceMagnitude);

  return direction;
}

/**
 * Calculate repulsion force to prevent nodes from overlapping
 */
export function calculateRepulsionForce(
  nodeA: ServiceNode,
  nodeB: ServiceNode,
  repulsionStrength: number = 2.0
): THREE.Vector3 {
  const direction = new THREE.Vector3().subVectors(nodeA.position, nodeB.position);
  const distance = direction.length();

  // Strong repulsion when very close
  if (distance < 0.1) {
    return new THREE.Vector3(
      (Math.random() - 0.5) * repulsionStrength * 10,
      (Math.random() - 0.5) * repulsionStrength * 10,
      (Math.random() - 0.5) * repulsionStrength * 10
    );
  }

  // Repulsion force: F = strength / distance^2
  const forceMagnitude = repulsionStrength / (distance * distance);

  direction.normalize().multiplyScalar(forceMagnitude);

  return direction;
}

/**
 * Calculate gravity well force - pulls all nodes toward center
 */
export function calculateGravityWellForce(
  node: ServiceNode,
  wellStrength: number = 0.15
): THREE.Vector3 {
  const centerDistance = node.position.length();

  // Avoid division by zero
  if (centerDistance < 0.1) return new THREE.Vector3(0, 0, 0);

  // Gravity well: F = -strength / distance
  // Always pulls toward center (0,0,0)
  const forceMagnitude = wellStrength * node.mass / Math.pow(centerDistance, 1.5);
  const direction = node.position.clone().normalize().multiplyScalar(-forceMagnitude);

  return direction;
}

/**
 * Update physics simulation for one frame - Gentle rotation to maintain funnel shape
 */
export function updatePhysics(
  nodes: ServiceNode[],
  deltaTime: number,
  attractionStrength: number = 0.1,
  repulsionStrength: number = 1.0,
  damping: number = 0.9
): void {
  // Rotate entire structure gently around Y-axis
  const rotationSpeed = 0.1; // Radians per second

  nodes.forEach((node, index) => {
    const totalServices = nodes.length;
    const normalizedIndex = index / totalServices;
    const depth = normalizedIndex;

    // Calculate target position in funnel
    const ringRadius = 15 * (1 - depth * 0.7);
    const y = 10 - depth * 20;

    // Rotate around Y-axis
    const currentAngle = Math.atan2(node.position.z, node.position.x);
    const newAngle = currentAngle + rotationSpeed * deltaTime;

    const targetX = ringRadius * Math.cos(newAngle);
    const targetZ = ringRadius * Math.sin(newAngle);

    // Smoothly interpolate to target position (maintains funnel shape)
    const lerpFactor = 0.05;
    node.position.x += (targetX - node.position.x) * lerpFactor;
    node.position.z += (targetZ - node.position.z) * lerpFactor;
    node.position.y += (y - node.position.y) * lerpFactor;

    // Add slight bobbing motion
    const bobAmount = Math.sin(Date.now() * 0.001 + index) * 0.1;
    node.position.y += bobAmount * deltaTime;
  });
}

/**
 * Check if two services should have a visible connection beam
 */
export function shouldDrawConnection(serviceA: Service, serviceB: Service, minShared: number = 2): boolean {
  const sharedCapabilities = serviceA.capabilities.filter(cap =>
    serviceB.capabilities.includes(cap)
  ).length;

  return sharedCapabilities >= minShared;
}

/**
 * Calculate connection strength (for beam opacity/thickness)
 */
export function getConnectionStrength(serviceA: Service, serviceB: Service): number {
  const sharedCapabilities = serviceA.capabilities.filter(cap =>
    serviceB.capabilities.includes(cap)
  ).length;

  // Normalize to 0-1 range (assuming max 5 shared capabilities)
  return Math.min(sharedCapabilities / 5, 1);
}
