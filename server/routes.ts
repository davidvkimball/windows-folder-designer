import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { IconProcessor } from "./services/icon-processor";
import { IcoParser } from "./services/ico-parser";
import { SvgProcessor } from "./services/svg-processor";
import sharp from "sharp";
import path from "path";

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const isSvg = file.mimetype === 'image/svg+xml' || file.originalname.toLowerCase().endsWith('.svg');
    const isIco = file.mimetype === 'application/octet-stream' || file.originalname.toLowerCase().endsWith('.ico');
    const isImage = file.mimetype.startsWith('image/');
    
    if (isImage || isIco || isSvg) {
      cb(null, true);
    } else {
      cb(new Error('Only image files, ICO files, and SVG files are allowed'));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Serve attached assets
  app.use('/attached_assets', express.static('attached_assets'));

  // Serve favicon.ico
  app.get('/favicon.ico', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'client', 'public', 'favicon.ico'));
  });

  // Parse ICO file and extract individual images
  app.post("/api/icons/parse-ico", upload.single('ico'), async (req, res) => {
    console.log("ICO upload request received");
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No ICO file provided" });
      }

      const icoBuffer = req.file.buffer;
      
      // Parse ICO file
      const images = IcoParser.parse(icoBuffer);
      
      // Convert images to base64 for client consumption
      const imageData: Record<string, string> = {};
      const targetSizes = [16, 20, 24, 32, 40, 64, 256];
      
      for (const targetSize of targetSizes) {
        const bestMatch = IcoParser.getBestMatch(images, targetSize);
        if (bestMatch) {
          try {
            let finalBuffer = bestMatch.buffer;
            let mimeType = 'image/png';
            
            // Convert BMP to PNG using Sharp for better browser compatibility
            if (bestMatch.format === 'bmp') {
              console.log(`Converting BMP to PNG for size ${targetSize}`);
              finalBuffer = await sharp(bestMatch.buffer).png().toBuffer();
            } else {
              mimeType = 'image/png'; // Assume PNG format
            }
            
            const base64 = finalBuffer.toString('base64');
            const dataUrl = `data:${mimeType};base64,${base64}`;
            
            console.log(`Creating data URL for size ${targetSize}: originalFormat=${bestMatch.format}, bufferSize=${finalBuffer.length}, urlLength=${dataUrl.length}`);
            
            imageData[targetSize.toString()] = dataUrl;
          } catch (conversionError) {
            console.error(`Failed to convert image for size ${targetSize}:`, conversionError);
          }
        }
      }

      console.log("ICO parsing completed:", {
        originalCount: images.length,
        generatedSizes: Object.keys(imageData),
        sampleDataUrlLength: Object.values(imageData)[0]?.length
      });

      res.json({
        success: true,
        images: imageData,
        originalCount: images.length,
        availableSizes: images.map(img => ({ 
          width: img.width, 
          height: img.height, 
          format: img.format 
        }))
      });

    } catch (error) {
      console.error("ICO parsing failed:", error);
      res.status(500).json({ 
        error: "Failed to parse ICO file",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Parse SVG file and generate size-specific PNG images
  app.post("/api/icons/parse-svg", upload.single('svg'), async (req, res) => {
    console.log("SVG upload request received");
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No SVG file provided" });
      }

      const svgBuffer = req.file.buffer;
      
      // Validate SVG content
      const validation = SvgProcessor.validateSvg(svgBuffer);
      if (!validation.valid) {
        return res.status(400).json({ 
          error: "Invalid SVG file",
          details: validation.error 
        });
      }

      // Get SVG dimensions for logging
      const dimensions = SvgProcessor.getSvgDimensions(svgBuffer);
      console.log("SVG dimensions:", dimensions);
      
      // Process SVG to multiple PNG sizes
      const targetSizes = [16, 20, 24, 32, 40, 64, 256];
      const imageData = await SvgProcessor.processToSizes(svgBuffer, targetSizes);

      console.log("SVG processing completed:", {
        generatedSizes: Object.keys(imageData),
        dimensions,
        sampleDataUrlLength: Object.values(imageData)[0]?.length
      });

      res.json({
        success: true,
        images: imageData,
        originalDimensions: dimensions,
        generatedSizes: Object.keys(imageData).map(size => parseInt(size))
      });

    } catch (error) {
      console.error("SVG parsing failed:", error);
      res.status(500).json({ 
        error: "Failed to parse SVG file",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  // Generate ICO file from uploaded PNG images
  app.post("/api/icons/generate-ico", upload.fields([
    { name: 'size_16', maxCount: 1 },
    { name: 'size_20', maxCount: 1 },
    { name: 'size_24', maxCount: 1 },
    { name: 'size_32', maxCount: 1 },
    { name: 'size_40', maxCount: 1 },
    { name: 'size_64', maxCount: 1 },
    { name: 'size_256', maxCount: 1 },
  ]), async (req, res) => {
    try {
      const files = req.files as Record<string, Express.Multer.File[]>;
      const imageBuffers: Record<string, Buffer> = {};

      // Extract buffers from uploaded files
      for (const [fieldName, fileArray] of Object.entries(files)) {
        if (fileArray && fileArray.length > 0) {
          const sizeMatch = fieldName.match(/size_(\d+)/);
          if (sizeMatch) {
            const size = sizeMatch[1];
            imageBuffers[size] = fileArray[0].buffer;
          }
        }
      }

      if (Object.keys(imageBuffers).length === 0) {
        return res.status(400).json({ error: "No valid images provided" });
      }

      // Process images and create ICO file
      const icoBuffer = await IconProcessor.processIcons(imageBuffers);

      res.set({
        'Content-Type': 'image/x-icon',
        'Content-Disposition': 'attachment; filename="custom-folder.ico"',
        'Content-Length': icoBuffer.length.toString(),
      });

      res.send(icoBuffer);
    } catch (error) {
      console.error("ICO generation failed:", error);
      res.status(500).json({ 
        error: "Failed to generate ICO file",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Generate ZIP file with PNG images
  app.post("/api/icons/generate-zip", upload.fields([
    { name: 'size_16', maxCount: 1 },
    { name: 'size_20', maxCount: 1 },
    { name: 'size_24', maxCount: 1 },
    { name: 'size_32', maxCount: 1 },
    { name: 'size_40', maxCount: 1 },
    { name: 'size_64', maxCount: 1 },
    { name: 'size_256', maxCount: 1 },
  ]), async (req, res) => {
    try {
      const files = req.files as Record<string, Express.Multer.File[]>;
      const imageBuffers: Record<string, Buffer> = {};

      // Extract buffers from uploaded files
      for (const [fieldName, fileArray] of Object.entries(files)) {
        if (fileArray && fileArray.length > 0) {
          const sizeMatch = fieldName.match(/size_(\d+)/);
          if (sizeMatch) {
            const size = sizeMatch[1];
            imageBuffers[size] = fileArray[0].buffer;
          }
        }
      }

      if (Object.keys(imageBuffers).length === 0) {
        return res.status(400).json({ error: "No valid images provided" });
      }

      // Process images and create ZIP file
      const zipBuffer = await IconProcessor.createZipFromPNGs(imageBuffers);

      res.set({
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="custom-folder-icons.zip"',
        'Content-Length': zipBuffer.length.toString(),
      });

      res.send(zipBuffer);
    } catch (error) {
      console.error("ZIP generation failed:", error);
      res.status(500).json({ 
        error: "Failed to generate ZIP file",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      service: "Windows Folder Designer"
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}
