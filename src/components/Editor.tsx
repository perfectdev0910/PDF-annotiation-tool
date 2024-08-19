import React, { useEffect, useRef, useState } from 'react'
import styled from 'styled-components'
import { useDrop } from 'react-dnd'
import { Rnd } from 'react-rnd'
import { Button, Checkbox, Space, Tooltip } from 'antd'
import { DeleteOutlined } from '@ant-design/icons'

import { pdfjs, Document, Page } from 'react-pdf'
import type { PDFDocumentProxy } from 'pdfjs-dist'
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`

import { Field, FieldProperties, Settings } from '../types'

const TempField = styled.div`
  position: absolute;
  padding: 5px;
  border: dashed 1px green;
  background-color: yellow;
`
const InsertField = styled.div`
  position: absolute;
  cursor: pointer;
  padding: 5px;
  overflow: hidden;

  &:hover {
    background-color: lightgray;
    border: dashed 1px green;
  }
`
const ActiveInsertField = styled(Rnd)`
  padding: 5px;
  border: dashed 1px green;
  background-color: yellow;
  overflow: hidden;
`

const AddedField = styled.div`
  position: absolute;
  cursor: pointer;
  padding: 5px;

  &:hover {
    background-color: lightgrey;
    border: dashed 1px green;
  }
`

const options = {
  cMapUrl: '/cmaps/',
  standardFontDataUrl: '/standard_fonts/',
};

interface Props {
  source: string,
  settings: Settings,
  scale: number
  selected: Field | null,
  active: FieldProperties | null,
  fieldsets: FieldProperties[],
  templates?: FieldProperties[],
  pageButtonCnt: number,
  onAddNewField: (field: FieldProperties) => void,
  onUpdateFields: (field: FieldProperties) => void
  onRemoveField: (id: string) => void,
  onActiveChange: (fields: FieldProperties | null) => void
  onClearSelected: () => void,
  onSuccessLoad: (page: number) => void,
  onPageChange: (page: number) => void,
  onMouseChange: (x: string, y: string) => void
}

const Editor = (props: Props) => {
  const temp = useRef<any>(null);
  const coordiate = useRef<any>(null);

  const [show, setShow] = useState(false)
  const [totalPages, setTotalPages] = useState(0);

  // const [posLT, setPosLT] = useState<any>(null)
  // const [posRB, setPosRB] = useState<any>(null)
  const { source, settings, selected, active, fieldsets, templates, pageButtonCnt, scale } = props;

  const { currentPage } = settings;

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Step 2: Use useEffect to log the scroll position
  useEffect(() => {
    const handleScroll = () => {
      // Access scroll position using ref.current.scrollTop
      const scrollContainer = scrollContainerRef.current;
      if (scrollContainer) {
        const pageCanvas = coordiate.current.parentNode;
        const scrollPosition = scrollContainer.scrollTop;
        // You can do something with the scroll position here
        if (currentPage !== Math.floor(scrollPosition / (pageCanvas.getBoundingClientRect().height + 10)) + 1) props.onPageChange(Math.floor(scrollPosition / (pageCanvas.getBoundingClientRect().height + 10)) + 1)
      }
    };

    // Attach scroll event listener whenever the ref is available
    if (scrollContainerRef.current) {
      scrollContainerRef.current.addEventListener('scroll', handleScroll);
    }

    // Clean up the event listener when the component is unmounted
    return () => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.removeEventListener('scroll', handleScroll);
      }
    };
  }); // No dependency array to run the effect on every render

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer && coordiate.current.parentNode) {
      const pageCanvas = coordiate.current.parentNode;
      scrollContainer.scrollTop = (pageCanvas.getBoundingClientRect().height + 10) * (currentPage - 1);
    }
  }, [pageButtonCnt])

  const [, drop] = useDrop(() => ({
    accept: 'field',
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  })
  )

  const descaleSize = (val: any) => {
    return (val / scale).toFixed(1);
  }

  const handleKeyPress = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      if (selected) {
        props.onClearSelected()
      }
      if (active) {
        props.onActiveChange(null)
      }
      console.log(selected, active);
    }
  };

  const handleMouseDown = (e: any) => {
    if (e.target.className === 'react-pdf__Page__canvas') {
      if (active) {
        props.onActiveChange(null)
      }
      // setPosLT({x: descaleSize(e.clientX), y: descaleSize(e.clientY)})
    }
  }

  const handleMouseMove = (e: any) => {
    if (selected) {
      const pageCanvas = coordiate.current.parentNode
      const left = Math.floor(e.clientX - pageCanvas.getBoundingClientRect().left)
      const top = Math.floor(e.clientY - pageCanvas.getBoundingClientRect().top)

      temp.current.style.left = `${descaleSize(left)}px`
      temp.current.style.top = `${descaleSize(top)}px`

      props.onMouseChange(`${descaleSize(left)}`, `${descaleSize(top)}`);
    }
    // if(posLT) {
    //   setPosRB({ x: descaleSize(e.clientX), y: descaleSize(e.clientY) })
    // }
  }

  const handleMouseUp = (_e: any) => {
    // setPosLT(null)
    // setPosRB(null)
  }

  const handleClick = (e: any, index: number) => {
    if (selected) {
      console.log(">>>>> cureent page", index, selected);
      const pageCanvas = coordiate.current.parentNode
      const left = Math.floor(e.clientX - pageCanvas.getBoundingClientRect().left)
      const top = Math.floor(e.clientY - pageCanvas.getBoundingClientRect().top)

      console.log(">>>> top", e.clientY, pageCanvas.getBoundingClientRect().top, top);

      const field: FieldProperties = {
        _id: new Date().getTime().toString(),
        page: totalPages - Math.floor(-(top - (pageCanvas.getBoundingClientRect().height + 10)) / (pageCanvas.getBoundingClientRect().height + 10)),
        type: selected,
        position: {
          x: parseFloat(descaleSize(left)),
          y: parseFloat(descaleSize(top - (pageCanvas.getBoundingClientRect().height + 10) * (Math.floor(top / (pageCanvas.getBoundingClientRect().height + 10)))))
        },
        container: selected.icon === 'image' ? {
          width: 200,
          height: 200
        } : {
          background: "#ffffff",
          border: "#ffffff",
          opacity: 100,
          height: Math.floor(e.target.getBoundingClientRect().height),
          width: Math.floor(e.target.getBoundingClientRect().width)
        },
        data: selected.icon === 'image' ? '' : selected.icon === 'choice' ? [{ title: selected.title, check: false }] : selected.title
      }

      props.onAddNewField(field)
      props.onClearSelected()
    }
  }

  const handleActiveField = (field: FieldProperties | null) => {
    if (active !== field) {
      setShow(true)
      props.onActiveChange(field)
    }
  }

  const handleCheckbox = (index: number, value: boolean) => {
    if (!active) return

    let modify = active
    modify.data[index].check = value

    props.onActiveChange(modify)
    props.onUpdateFields(modify)
  }

  const handleRemoveField = (item: FieldProperties) => {
    if (!item._id) return

    props.onActiveChange(null)
    props.onRemoveField(item._id)
  }

  const updatePosition = (_pos: any, e: any) => {
    setShow(true)
    handleTooltipShow(true)

    // const top = Math.floor(e.y - pageCanvas.getBoundingClientRect().top)
    let modify = active as FieldProperties;

    modify.position = {
      x: e.x,
      // y: (e.y * scale + pageCanvas.getBoundingClientRect().height + 10) % (pageCanvas.getBoundingClientRect().height + 10)
      y: (e.y + 802) % 802
    }
    modify.page = Math.floor((e.y + (modify?.page - 1) * 802) / 802) + 1

    props.onActiveChange(modify)
    props.onUpdateFields(modify)
  }

  const updateSize = (dir: any, _delta: any, pos: any, e: any) => {
    if (!active?.position || !active.position.x || !active.position.y) return
    const pageCanvas = coordiate.current.parentNode

    let top = 0, left = 0;
    const mouseL = descaleSize(Math.floor(pos.clientX - pageCanvas.getBoundingClientRect().left))
    const mouseT = descaleSize(Math.floor(pos.clientY - pageCanvas.getBoundingClientRect().top) - (pageCanvas.getBoundingClientRect().height + 10) * (Math.floor(Math.floor(pos.clientY - pageCanvas.getBoundingClientRect().top) / (pageCanvas.getBoundingClientRect().height + 10))))

    const page = totalPages - Math.floor(-(Math.floor(pos.clientY - pageCanvas.getBoundingClientRect().top) - (pageCanvas.getBoundingClientRect().height + 10)) / (pageCanvas.getBoundingClientRect().height + 10));

    switch (dir) {
      case 'top':
        top = parseFloat(mouseT)
        left = active.position.x
        break;
      case 'topLeft':
        top = parseFloat(mouseT)
        left = parseFloat(mouseL)
        break;
      case 'left':
        top = active.position.y
        left = parseFloat(mouseL)
        break;
      case 'topRight':
        top = parseFloat(mouseT)
        left = active.position.x
        break;
      case 'bottomLeft':
        top = active.position.y
        left = parseFloat(mouseL)
        break;
      case 'bottom':
      case 'bottomRight':
      case 'right':
      default:
        left = active.position.x
        top = active.position.y
        break;
    }

    let modify = {
      ...active,
      container: {
        ...active?.container,
        width: e.offsetWidth,
        height: e.offsetHeight
      },
      position: {
        x: left,
        y: top
      },
      page: page
    }

    props.onActiveChange(modify)
    props.onUpdateFields(modify)
  }

  const renderTempField = () => {
    if (!selected) return
    if (Array.isArray(selected)) {
      return
    } else {
      return (
        <TempField
          ref={temp}>
          {
            selected.icon === 'image' ?
              <img src={'200x200.png'} style={{ width: '200px', height: '200px', position: 'relative', zIndex: -1 }} />
              :
              <span style={{ whiteSpace: 'nowrap' }}>{selected.title}</span>
          }
        </TempField>
      )
    }
  }

  // const renderSelectionRect = () => {
  //   const page = coordiate.current.parentNode

  //   const left = Math.floor(Math.min(posLT.x, posRB.x) - page.getBoundingClientRect().left)
  //   const top = Math.floor(Math.min(posLT.y, posRB.y) - page.getBoundingClientRect().top)
  //   const width = Math.abs(posLT.x - posRB.x)
  //   const height = Math.abs(posLT.y - posRB.y)

  //   return (
  //     <RectSelection style={{ top: `${top}px`, left: `${left}px`, width: `${width}px`, height: `${height}px`, }}>
  //     </RectSelection>
  //   )
  // }

  const handleTooltipShow = (visible: boolean) => {

    const tooltip = document.getElementsByClassName('ant-tooltip')[0] as HTMLElement;
    if (!tooltip) return;

    if (visible) {
      tooltip.style.display = 'block'
    } else {
      tooltip.style.display = 'none'
    }
  }

  const renderCurrentFields = (page: number) => {
    if (!fieldsets) return
    const renderCurrentList = fieldsets.filter((item: FieldProperties) => item.page === page);
    console.log(">>> renderCurrentFiedls ", renderCurrentList, fieldsets, currentPage, page);

    return renderCurrentList.map((item: FieldProperties) => {
      if (item === active) {
        return (
          <Tooltip
            color='lightgray'
            key={item._id}
            style={{ display: 'block' }}
            open={show}
            title={
              <Space.Compact>
                <Button type='primary' onClick={() => handleRemoveField(item)} danger icon={<DeleteOutlined />} />
              </Space.Compact>
            }>
            <ActiveInsertField
              position={{
                x: item.position.x as number,
                y: item.position.y as number
              }}
              size={{
                width: item.container?.width as string | number,
                height: item.container?.height as string | number
              }}
              scale={scale}
              style={{
                display: 'flex',
                flexDirection: 'column',
                fontSize: `${item.font?.size}px`,
                fontFamily: `${item.font?.family}`,
                border: `dash 1px green`,
                background: `yellow`,
                opacity: `${item.container?.opacity}%`,
              }}
              onDragStart={() => { handleTooltipShow(false) }}
              onDragStop={(e: any, d: any) => updatePosition(e, d)}
              onResizeStop={(e: any, d: any, ref: any, delta: any, _position: any) => updateSize(d, delta, e, ref)}
              // bounds=".coord"
              onClick={() => handleActiveField(item)}
            >
              {
                item.type.icon === 'image' ?
                  <img draggable={false} src={item.data as string} style={{ width: '100%', height: '100%', position: 'relative', zIndex: -1 }} />
                  :
                  Array.isArray(item.data) ?
                    item.data.map((choice, idx) => {
                      return (
                        <Checkbox
                          style={{
                            fontSize: `${item.font?.size}px`,
                            fontFamily: `${item.font?.family}`,
                            opacity: `${item.container?.opacity}%`,
                            whiteSpace: 'nowrap'
                          }}
                          key={idx}
                          checked={choice.check}
                          onChange={e => handleCheckbox(idx, e.target.checked)}
                          title={choice.title}> {choice.title} </Checkbox>
                      );
                    })
                    :
                    <span style={{ whiteSpace: 'nowrap' }}>{item.data}</span>
              }
            </ActiveInsertField>
          </Tooltip>
        )
      } else {

        return (
          <InsertField
            key={item._id}
            onClick={() => handleActiveField(item)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              width: `${item.container?.width}px`,
              height: `${item.container?.height}px`,
              fontSize: `${item.font?.size}px`,
              fontFamily: `${item.font?.family}`,
              border: `solid 1px ${item.container?.border}`,
              background: `${item.container?.background}`,
              opacity: `${item.container?.opacity}%`,
              left: `${item.position.x}px`,
              top: `${item.position.y}px`,
            }}
          >
            {
              item.type.icon === 'image' ?
                <img draggable={false} src={item.data as string} style={{ width: '100%', height: '100%' }} />
                :
                Array.isArray(item.data) ?
                  item.data.map((choice, idx) => <Checkbox
                    style={{
                      color: 'black',
                      fontSize: `${item.font?.size}px`,
                      fontFamily: `${item.font?.family}`,
                      opacity: `${item.container?.opacity}%`,
                      whiteSpace: 'nowrap'
                    }}
                    key={idx}
                    checked={choice.check}>
                    {choice.title}
                  </Checkbox>
                  )
                  :
                  <span style={{ whiteSpace: 'nowrap' }}>{item.data}</span>
            }
          </InsertField>
        )
      }
    });
  };

  const renderAddedFileds = (page: number) => {
    if (!templates) return

    const renderAddedList = templates.filter((item: FieldProperties) => item.page === page);

    return renderAddedList.map((item: FieldProperties, index: number) => {
      if (item.type.icon === 'image') {
        return <AddedField
          style={{
            width: `${item.container?.width}px`,
            height: `${item.container?.height}px`,
            border: `solid 1px ${item.container?.border}`,
            background: `${item.container?.background}`,
            opacity: `${item.container?.opacity}%`,
            left: `${item.position.x}px`,
            top: `${item.position.y}px`
          }}
          key={index}>
          <img src={item.data as string} draggable={false} alt={item.data.toString()} style={{ width: '100%', height: '100%' }} />
        </AddedField>
      } else if (item.type.icon === 'choice') {
        return <AddedField
          key={index}
          style={{
            width: `${item.container?.width}px`,
            height: `${item.container?.height}px`,
            border: `solid 1px ${item.container?.border}`,
            background: `${item.container?.background}`,
            opacity: `${item.container?.opacity}%`,
            left: `${item.position.x}px`,
            top: `${item.position.y}px`
          }}>
          {
            Array.isArray(item.data) && item.data.map(choice => {
              return <Checkbox
                style={{
                  color: 'black',
                  fontSize: `${item.font?.size}px`,
                  fontFamily: `${item.font?.family}`,
                  opacity: `${item.container?.opacity}%`,
                  whiteSpace: 'nowrap'
                }}
                key={choice.title}
                checked={choice.check}>
                {choice.title}
              </Checkbox>
            })
          }
        </AddedField>
      } else {
        return <AddedField
          style={{
            width: `${item.container?.width}px`,
            height: `${item.container?.height}px`,
            border: `solid 1px ${item.container?.border}`,
            background: `${item.container?.background}`,
            opacity: `${item.container?.opacity}%`,
            left: `${item.position.x}px`,
            top: `${item.position.y}px`
          }}
          key={index}>
          <span style={{ whiteSpace: 'nowrap' }}>{item.data}</span>
        </AddedField>
      }
    })
  }

  const loadSuccess = ({ numPages: nextNumPages }: PDFDocumentProxy) => {
    props.onSuccessLoad(nextNumPages);
    setTotalPages(nextNumPages);
  }


  return (
    <Document
      onLoadSuccess={loadSuccess}
      options={options}
      file={source}>
      <div
        style={{
          height: 'calc(100vh - 116px)',
          overflow: 'auto',
          backgroundColor: 'lightgray',
          // display: 'flex',
          justifyContent: 'center',
          paddingTop: '10px',
          // paddingBottom: '20px'
        }}
        ref={scrollContainerRef}
      >
        {
          Array.from(new Array(totalPages), (el, index) => {
            console.log(el);
            return (
              <div
                style={{
                  justifyContent: "center",
                  display: "flex",
                  marginBottom: "10px"
                }}
                key={index}
              >
                <Page
                  key={`page_${index + 1}`}
                  pageNumber={index + 1}
                  scale={scale}
                  height={790}
                  canvasRef={drop}
                  onKeyPress={handleKeyPress}
                  onClick={(e) => handleClick(e, index + 1)}
                  // onClick={() => alert(index)}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  // pageNumber={currentPage}
                  renderAnnotationLayer={false}
                  renderTextLayer={false}
                >
                  <div id='elementToCapture' style={{ position: 'absolute', top: 0, left: 0, transformOrigin: 'top left', transform: `scale(${scale})`, zIndex: 1 }} className="viewport">
                    {selected && index === (totalPages - 1) && renderTempField()}
                    {renderCurrentFields(index + 1)}
                    {renderAddedFileds(index + 1)}
                    {/* {posRB && renderSelectionRect()} */}
                  </div>
                  {index === (totalPages - 1) && <div className='coord' ref={coordiate} style={{ position: 'absolute', top: 0, left: 0, zIndex: -1, scale: 1 }}></div>}
                </Page>
              </div>
            )
          })}

      </div>
    </Document>
  );
}

export default Editor;