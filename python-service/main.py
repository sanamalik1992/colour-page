from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
import cv2
import numpy as np
import logging
from typing import Optional

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Coloring Page Generator - Professional XDoG")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def xdog_edge_detection(image: np.ndarray, sigma: float = 0.4, k: float = 1.6, 
                        gamma: float = 0.98, epsilon: float = 0.1, phi: float = 10) -> np.ndarray:
    """
    Extended Difference of Gaussians (XDoG) - Professional edge detection for coloring pages.
    This is the algorithm used by professional comic/manga line art generators.
    
    Much better than Canny for coloring pages because:
    - Produces smooth, continuous lines
    - No broken edges
    - Adjustable line thickness
    - Clean, artistic results
    
    Paper: "XDoG: An eXtended difference-of-Gaussians compendium"
    """
    
    # Normalize image to [0, 1]
    img_normalized = image.astype(np.float32) / 255.0
    
    # Apply two Gaussian blurs with different sigma values
    gauss1 = cv2.GaussianBlur(img_normalized, (0, 0), sigma)
    gauss2 = cv2.GaussianBlur(img_normalized, (0, 0), sigma * k)
    
    # Difference of Gaussians
    dog = gauss1 - gamma * gauss2
    
    # Extended DoG with soft thresholding
    dog = dog / dog.max()  # Normalize
    
    # Apply soft threshold
    edges = np.where(dog < epsilon, 1 + np.tanh(phi * dog), 1)
    
    # Convert back to uint8
    edges = (edges * 255).astype(np.uint8)
    
    return edges

def photo_to_coloring_page(
    image: np.ndarray,
    line_thickness: int = 3,
    edge_sensitivity: int = 100,
    noise_reduction: int = 3
) -> np.ndarray:
    """
    Professional coloring page generation using XDoG algorithm.
    This produces smooth, artistic line art like professional coloring books.
    """
    
    logger.info(f"Processing image: {image.shape}")
    logger.info(f"Parameters: line_thickness={line_thickness}, edge_sensitivity={edge_sensitivity}, noise_reduction={noise_reduction}")
    
    # Step 1: Convert to grayscale
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    logger.info("✓ Step 1: Grayscale conversion")
    
    # Step 2: Bilateral filter (preserve edges, reduce noise)
    denoised = cv2.bilateralFilter(gray, d=9, sigmaColor=75, sigmaSpace=75)
    logger.info("✓ Step 2: Bilateral filter")
    
    # Step 3: CLAHE (enhance local contrast)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(denoised)
    logger.info("✓ Step 3: CLAHE contrast enhancement")
    
    # Step 4: XDoG edge detection (THE SECRET SAUCE!)
    # Adjust sigma based on edge sensitivity
    sigma = 0.3 + (150 - edge_sensitivity) / 200.0  # Lower sensitivity = larger sigma = more edges
    
    logger.info(f"✓ Step 4: XDoG edge detection (sigma={sigma:.2f})")
    edges = xdog_edge_detection(
        enhanced,
        sigma=sigma,
        k=1.6,
        gamma=0.98,
        epsilon=0.05,
        phi=10
    )
    
    # Step 5: Invert (we want black lines on white)
    inverted = cv2.bitwise_not(edges)
    logger.info("✓ Step 5: Color inversion")
    
    # Step 6: Threshold to pure black/white
    _, binary = cv2.threshold(inverted, 240, 255, cv2.THRESH_BINARY)
    logger.info("✓ Step 6: Binary threshold")
    
    # Step 7: Thicken lines based on line_thickness parameter
    if line_thickness > 1:
        kernel_size = line_thickness + 1