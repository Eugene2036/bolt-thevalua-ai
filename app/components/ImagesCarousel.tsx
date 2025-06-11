import { useMemo } from 'react';
import Carousel from 'react-gallery-carousel';
import 'react-gallery-carousel/dist/index.css';

interface Props {
    imageUrls: string[];
    carouselProps?: Partial<React.ComponentProps<typeof Carousel>>;
}

export function ImagesCarousel(props: Props) {
    const { imageUrls, carouselProps } = props;

    if (!imageUrls || imageUrls.length === 0) {
        return <div>No images to display.</div>;
    }

    const images = useMemo(() => {
        return imageUrls.map((imageUrl, index) => ({
            src: imageUrl,
            alt: `Image ${index + 1}`,
        }));
    }, [imageUrls]);

    return (
        <Carousel
            className='rounded-lg'
            images={images}
            canAutoPlay={false}
            objectFit="cover"
            style={{ flexGrow: 1, height: '150px', width: '100%', motion: 'ease-in-out' }}
            {...carouselProps}
        />
    );
}