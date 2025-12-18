import { forwardRef, useRef, useEffect, useImperativeHandle } from "react";
import "../index.css";

const Canvas = forwardRef(({ draw, ...rest }, ref) => {
  const canvasRef = useRef(null);

  useImperativeHandle(ref, () => canvasRef.current);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    draw(context);
  }, [draw]);

  return <canvas ref={canvasRef} {...rest} />;
});

export default Canvas;
