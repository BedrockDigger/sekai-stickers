import {
  ImageList,
  ImageListItem,
  Popover,
  TextField,
  IconButton,
  Tooltip,
  useMediaQuery,
} from "@mui/material";
import { useState, useMemo, useCallback } from "react";
import characters from "../characters.json";
import { PersonSearch } from "@mui/icons-material";

const pickerItemSx = {
  cursor: "pointer",
  "&:hover": {
    opacity: 0.5,
  },
  "&:active": {
    opacity: 0.8,
  },
};

export default function Picker({ setCharacter, color }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [search, setSearch] = useState("");
  const isSmallScreen = useMediaQuery("(max-width:600px)");

  const handleClick = useCallback((event) => {
    setAnchorEl(event.currentTarget);
  }, []);

  const handleClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const open = Boolean(anchorEl);
  const id = open ? "picker" : undefined;

  const handleCharacterSelect = useCallback((index) => {
    handleClose();
    setCharacter(index);
  }, [handleClose, setCharacter]);

  const handleSearchChange = useCallback((e) => {
    setSearch(e.target.value);
  }, []);

  const renderedItems = useMemo(() => {
    const s = search.toLowerCase();
    return characters.reduce((acc, c, index) => {
      if (
        s === c.id ||
        c.name.toLowerCase().includes(s) ||
        c.character.toLowerCase().includes(s)
      ) {
        acc.push(
          <ImageListItem
            key={index}
            onClick={() => handleCharacterSelect(index)}
            sx={pickerItemSx}
          >
            <img
              src={`/img/${c.img}`}
              srcSet={`/img/${c.img}`}
              alt={c.name}
              loading="lazy"
            />
          </ImageListItem>
        );
      }
      return acc;
    }, []);
  }, [search, handleCharacterSelect]);

  return (
    <div>
      <Tooltip title="Pick character">
        <IconButton
          aria-describedby={id}
          color="secondary"
          onClick={handleClick}
          style={{ fontFamily: "YurukaStd" }}
          sx={{ color: color }}
          size="small"
        >
          <PersonSearch />
        </IconButton>
      </Tooltip>

      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
        className="modal"
      >
        <div className="picker-search">
          <TextField
            label="Search character"
            size="small"
            color="secondary"
            value={search}
            multiline
            fullWidth
            onChange={handleSearchChange}
          />
        </div>
        <div className="image-grid-wrapper">
          <ImageList
            sx={{
              width: isSmallScreen ? 300 : 500,
              maxWidth: "calc(100vw - 32px)",
              height: 450,
              overflow: "visible",
            }}
            cols={isSmallScreen ? 3 : 4}
            rowHeight={140}
            className="image-grid"
          >
            {renderedItems}
          </ImageList>
        </div>
      </Popover>
    </div>
  );
}
