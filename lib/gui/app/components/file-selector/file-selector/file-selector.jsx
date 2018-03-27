/*
 * Copyright 2018 resin.io
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict'

const _ = require('lodash')
const os = require('os')
const path = require('path')
const React = require('react')
const propTypes = require('prop-types')
const { default: styled } = require('styled-components')
const rendition = require('rendition')
const prettyBytes = require('pretty-bytes')
const fontAwesome = require('@fortawesome/fontawesome')
const {
  faFileAlt,
  faFolder,
  faAngleLeft,
  faHdd
} = require('@fortawesome/fontawesome-free-solid')
const Storage = require('../../../models/storage')
const analytics = require('../../../modules/analytics')
const middleEllipsis = require('../../../utils/middle-ellipsis')
const files = require('../../../../../shared/files')
const selectionState = require('../../../../../shared/models/selection-state')

/**
 * @summary Recent files localStorage object key
 * @constant
 * @private
 */
const RECENT_FILES_KEY = 'file-selector-recent-files'
const recentStorage = new Storage(RECENT_FILES_KEY)

/**
 * @summary How many directories to show with the breadcrumbs
 * @type {Number}
 * @constant
 * @private
 */
const MAX_DIR_CRUMBS = 3

/**
 * @summary Character limit of a filename before a middle-ellipsis is added
 * @constant
 * @private
 */
const FILENAME_CHAR_LIMIT = 20

/**
 * @summary Character limit of a filename before a middle-ellipsis is added
 * @constant
 * @private
 */
const FILENAME_CHAR_LIMIT_SHORT = 15

/**
 * @summary Color scheme
 * @constant
 * @private
 */
const colors = {
  primary: {
    color: '#3a3c41',
    background: '#ffffff'
  },
  secondary: {
    color: '#1c1d1e',
    background: '#ebeff4',
    title: '#b3b6b9'
  }
}

const icons = {
  faFileAlt: fontAwesome.icon(faFileAlt).html[0],
  faFolder: fontAwesome.icon(faFolder).html[0],
  faAngleLeft: fontAwesome.icon(faAngleLeft).html[0],
  faHdd: fontAwesome.icon(faHdd).html[0]
}

const Subtitle = styled.div`
  color: gray;
  text-align: center;
`

const Icon = styled((props) => {
  const { type, ...restProps } = props

  return (
    <span className={ props.className } dangerouslySetInnerHTML={ { __html: icons[type] } } { ...restProps } />
  )
})`
  color: ${props => props.color};
  font-size: ${props => props.size};
`

const FileLink = styled((props) => {
  const icon = props.isDirectory ? 'faFolder' : 'faFileAlt'

  return (
    <Flex
      direction="column"
      alignItems="center"
      className={ props.className }
      onClick={ props.onClick }
      onDoubleClick={ props.onDoubleClick }
      highlight={ props.highlight }>
      <Icon type={ icon } size="48px" />
      <rendition.Button
        plaintext={ true }
        tooltip={ props.basename }>
        { middleEllipsis(props.basename || '', FILENAME_CHAR_LIMIT) }
      </rendition.Button>
      <Subtitle>{ prettyBytes(props.size || 0) }</Subtitle>
    </Flex>
  )
})`
  width: 80px;
  max-height: 128px;
  margin: 0 10px 10px 10px;
  background-color: ${ props => props.highlight ? colors.secondary.background : 'none' };
  transition: 0.15s background-color ease-in-out;
  color: ${ colors.primary.color };
  cursor: pointer;
  border-radius: 2px;
`

const Header = styled.header`
  display: flex;
  flex: 0 0 auto;
  align-items: baseline;
  margin: 10px 15px;

  > * {
    margin: 5px;
  }
`

const Main = styled.main`
  display: flex;
  flex: 1;
  margin-left: 20px;
`

const Footer = styled.footer`
  display: flex;
  justify-content: flex-end;
  margin: 10px 20px;
  flex: 0 0 auto;

  > * {
    margin: 0 10px;
  }
`

const MenuWrap = styled.div`
  display: flex;
  flex: auto;
  justify-content: space-between;
  margin: 8px;
`

const FileListWrap = styled.div`
  display: flex;
  flex-wrap: wrap;
  overflow-x: hidden;
  overflow-y: auto;
`

const Flex = styled.div`
  display: flex;
  flex-direction: ${ props => props.direction };
  justify-content: ${ props => props.justifyContent };
  align-items: ${ props => props.alignItems };
  flex-wrap: ${ props => props.flexWrap };
  height: ${ props => props.height };
  flex-grow: ${ props => props.grow };
`

class RecentFilesUnstyled extends React.PureComponent {
  constructor (props) {
    super(props)

    this.state = {
      recents: recentStorage.get('recents'),
      favorites: recentStorage.get('favorites')
    }
  }

  render () {
    const existing = (fileObjs) => {
      return _.filter(fileObjs, (fileObj) => {
        return files.exists(fileObj.fullpath)
      })
    }

    return (
      <div className={ this.props.className }>
        <h5>Recent</h5>
        {
          _.map(existing(this.state.recents), (file) => {
            return (
              <rendition.Button
                onClick={ () => this.props.selectFile(files.getFileMetadataSync(file.dirname)) }
                plaintext={ true }>
                { middleEllipsis(path.basename(file.dirname), FILENAME_CHAR_LIMIT_SHORT) }
              </rendition.Button>
            )
          })
        }
        <h5>Favorite</h5>
        {
          _.map(existing(this.state.favorites), (file) => {
            return (
              <rendition.Button
                onClick={ () => this.props.selectFile(files.getFileMetadataSync(file.fullpath)) }
                plaintext={ true }>
                { middleEllipsis(file.basename, FILENAME_CHAR_LIMIT_SHORT) }
              </rendition.Button>
            )
          })
        }
      </div>
    )
  }

  componentWillMount () {
    window.addEventListener('storage', this.onStorage)
  }

  componentWillUnmount () {
    window.removeEventListener('storage', this.onStorage)
  }

  onStorage (event) {
    if (event.key === RECENT_FILES_KEY) {
      this.setState(event.newValue)
    }
  }
}

const RecentFiles = styled(RecentFilesUnstyled)`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  width: 130px;
  background-color: ${colors.secondary.background};
  padding: 20px;
  color: ${colors.secondary.color};

  > h5 {
    color: ${colors.secondary.title};
    font-size: 11px;
    font-weight: 500;
    text-transform: uppercase;
    margin-bottom: 15px;
  }

  > button {
    margin-bottom: 10px;
    text-align: start;
  }
`

const labels = {
  '/': 'Root'
}

const Breadcrumbs = styled((props) => {
  const folderConstraint = props.constraint || path.parse(props.path).root
  const dirs = files.subpaths(props.path).filter((subpath) => {
    // Guard against displaying folders outside the constrained folder
    return !path.relative(folderConstraint, subpath.fullpath).startsWith('..')
  })

  return (
    <div className={ props.className }>
      { dirs.length > MAX_DIR_CRUMBS ? '... / ' : null }
      {
        _.map(dirs.slice(-MAX_DIR_CRUMBS), (dir, index) => {
          return (
            <rendition.Button
              onClick={ () => props.selectFile(dir) }
              plaintext={ true }>
              <rendition.Txt bold={ index === dirs.length - 1 }>
                { middleEllipsis(labels[dir.fullpath] || dir.basename, FILENAME_CHAR_LIMIT_SHORT) }
              </rendition.Txt>
            </rendition.Button>
          )
        })
      }
    </div>
  )
})`
  font-size: 18px;

  & > button:not(:last-child)::after {
    content: '/';
    margin: 9px;
  }
`

class FileSelector extends React.PureComponent {
  constructor (props) {
    super(props)

    const fullpath = props.path || os.homedir()

    this.state = {
      path: fullpath,
      files: [],
      history: [],
      highlighted: null,
      error: null,
      filters: []
    }

    // Filters schema
    this.schema = {
      type: 'object',
      properties: {
        basename: {
          type: 'string'
        },
        isHidden: {
          type: 'boolean'
        },
        isDirectory: {
          type: 'boolean'
        }
      }
    }

    this.closeModal = this.closeModal.bind(this)
    this.browsePath = this.browsePath.bind(this)
    this.selectFile = this.selectFile.bind(this)
    this.previousDirectory = this.previousDirectory.bind(this)
  }

  render () {
    const items = rendition.SchemaSieve.filter(this.state.filters, this.state.files)

    const styles = {
      display: 'flex',
      height: 'calc(100vh - 20px)',
    }

    const errorModal = (
      <rendition.Modal
        title="Error"
        done={ () => this.setState({ error: null }) }
        action="Dismiss"
        primaryButtonProps={ { danger: true, primary: false } }
      >
        { this.state.error }
      </rendition.Modal>
    )

    return (
      <rendition.Provider
        style={ styles }>
        <Flex flex="0 0 auto">
          <RecentFiles selectFile={ this.selectFile } />
        </Flex>
        <Flex direction="column" grow="1">
          <Header>
            <rendition.Button
              bg={ colors.secondary.background }
              color={ colors.primary.color }
              disabled={ !this.state.history.length }
              onClick={ this.previousDirectory }>
              <Icon type={ 'faAngleLeft' } />
              &nbsp;Back
            </rendition.Button>
            <Icon type={ 'faHdd' } />
            <Breadcrumbs
              path={ this.state.path }
              selectFile={ this.selectFile }
              constraint={ this.props.constraint }
            />
          </Header>
          <Main>
            <Flex direction="column" grow="1">
              <rendition.Filters
                onFiltersUpdate={ filters => this.setFilters(filters) }
                onViewsUpdate={ views => this.setViews(views) }
                schema={ this.schema }
                renderMode={ [] } />

              <FileListWrap>
                {
                  items.map((item, index) => {
                    return (
                      <FileLink { ...item }
                        highlight={ _.get(this.state.highlighted, 'fullpath') === _.get(item, 'fullpath') }
                        onClick={ () => this.setState({ highlighted: item }) }
                        onDoubleClick={ _.partial(this.selectFile, item) }
                      />
                    )
                  })
                }
              </FileListWrap>
            </Flex>
          </Main>
          <Footer>
            <rendition.Button onClick={ this.closeModal }>Cancel</rendition.Button>
            <rendition.Button
              primary
              onClick={ _.partial(this.selectFile, this.state.highlighted) }
              disabled={ !this.state.highlighted }>
              Select file
            </rendition.Button>
          </Footer>
        </Flex>
        { this.state.error ? errorModal : null }
      </rendition.Provider>
    )
  }

  componentDidMount () {
    this.setFilesProgressively(this.state.path)
  }

  closeModal () {
    this.props.close()
  }

  setFilesProgressively (dirname) {
    return files.getDirectory(dirname).then((basenames) => {
      const fileObjs = basenames.map((basename) => {
        return {
          dirname: this.state.path,
          basename,
          fullpath: path.join(dirname, basename)
        }
      })

      this.setState({ files: fileObjs })

      return files.getAllFilesMetadataAsync(dirname, basenames)
    }).then((fileObjs) => {
      this.setState({ files: fileObjs })
    })
  }

  browsePath (file) {
    analytics.logEvent('File browse', file)

    const folderConstraint = this.props.constraint || path.parse(this.state.path).root

    // Guard against browsing outside the constrained folder
    if (path.relative(folderConstraint, file.fullpath).startsWith('..')) {
      const error = `Cannot browse outside constrained folder ${constrainedFolder}`
      analytics.logException(new Error(error))
      this.setState({ error })
      return
    }

    this.setFilesProgressively(file.fullpath).then(() => {
      this.setState({ path: file.fullpath })
    })
  }

  selectFile (file, event) {
    if (file === null) {
      analytics.logEvent('File dismiss', null)
    } else if (file.isDirectory) {
      const prevFile = files.getFileMetadataSync(this.state.path)
      this.setState({
        history: this.state.history.concat(prevFile)
      })
      this.browsePath(file)
    } else {
      analytics.logEvent('File select', file.basename)

      selectionState.selectImage({
        path: file.fullpath,
        extension: file.extension,
        size: {
          original: file.size,
          final: {
            value: file.size,
            estimation: false
          }
        }
      })

      // Add folder to recently used
      recentStorage.modify('recents', (recents) => {
        const newRecents = _.uniqBy([ file ].concat(recents), (recentFile) => {
          return recentFile.fullpath
        })
        return newRecents
      }, [])

      // Add file to potential favorites list
      recentStorage.modify('favorites', (favorites) => {
        const favorite = _.find(favorites, (favoriteFile) => {
          return favoriteFile.fullpath === file.fullpath
        }) || _.assign({}, file, { frequency: 1 })

        return _.uniqBy([ favorite ].concat(favorites), (favoriteFile) => {
          return favoriteFile.fullpath
        })
      }, [])

      this.closeModal()
    }
  }

  previousDirectory () {
    analytics.logEvent('Prev directory', null)
    const dir = this.state.history.shift()
    this.setState({ history: this.state.history })

    if (dir) {
      this.browsePath(dir)
    }
  }

  setFilters (filters) {
    this.setState({ filters })
  }

  setViews (views) {
    this.setState({ views })
  }
}

FileSelector.propTypes = {
  path: propTypes.string,

  close: propTypes.func,

  constraint: propTypes.string
}

module.exports = FileSelector
