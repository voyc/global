<?php

function makeThumbnail($src,$dest,$Width,$Height,$fileSize) {

	##################
	### usage:	src and dest are required.
	###		Width,Height if omitted (or set to 0) are taken from the src file
	###		if Width or Height are provided image is resized maintaining Aspect Ratio
	###		if both Width and Height are provided then AR is ignored.
	###		if fileSize is given and non-zero the image produced will be produced
	###		with the maximum quality possible under that filesize
	###		Only when quality reaches 0 will the filesize be over filesize provided.

	$debug=0;

	if (file_exists($src)  && isset($dest)) {
		# Import the information        
		$srcSize  = getImageSize($src);
      
		// image dest size $destSize[0] = width, $destSize[1] = height
		$srcRatio  = $srcSize[0]/$srcSize[1]; // width/height ratio
       
		if(isset($Width) and isset($Height)) {
			if($Width>0 and $Height>0){
				$destSize[1]=$Height;
				$destSize[0]=$Width;
			}
			elseif($Width>0){
	           		$destSize[0] = $Width;
			        $destSize[1] = $Width/$srcRatio;
	    }
			elseif($Height>0){
			        $destSize[1] = $Height;
			        $destSize[0] = $Height*$srcRatio;
	    }
			else{
				$destSize=$srcSize;
			}
		}
		else {
			$destSize=$srcSize;
		}
		if($debug){print "ssize(w/h):$srcSize[0]/$srcSize[1] ar:".($srcSize[0]/$srcSize[1])."\n";}
		if($debug){print "dsize(w/h):$destSize[0]/$destSize[1] ar:".($destSize[0]/$destSize[1])."\n";}

		# Create the new image and set the properties.
		$destImage = imageCreateTrueColor($destSize[0],$destSize[1]);
		imageAntiAlias($destImage,true);

    # Import the source image
		switch ($srcSize[2]) {
      case 1: //GIF
				$srcImage = imageCreateFromGif($src);
				break;
          
			case 2: //JPEG
				$srcImage = imageCreateFromJpeg($src);
				break;
        
			case 3: //PNG
				$srcImage = imageCreateFromPng($src);
				break;

			default:
				return false;
				break;
		}

 		// resample the image
 		imageCopyResampled($destImage, $srcImage, 0, 0, 0, 0,$destSize[0],$destSize[1],$srcSize[0],$srcSize[1]);
      
 		// generating image and regenerating till filesize matches.
		$quality=100;
		$dir=-100;
		while($dir != 0) {
	    if($debug){print " q: $quality";}
			imageJpeg($destImage,$dest,$quality);
			clearstatcache();
			$fs = filesize($dest);
			if($debug){print " fs/dfs: $fs/$fileSize ";}
			if($fileSize>0){
				$oldq = $quality;
			
				if($dir < 0){$dir = 0 - $dir;}
				$dir = (int)($dir/2);

				if($fs > $fileSize){
					$dir = 0 - $dir;
					if($dir == 0){
						$dir = -1;
					}
				}
				
				if($debug){print "dir: $dir\n";}
				$quality = $quality + $dir;
				if($oldq == $quality){break;}
				if($quality<0 or $quality>100){break;}

			}
			else{$dir=0;}
		}
		return true;
	}
 	else {
 		return false;
	}
}
?>